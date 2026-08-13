/** MIDI events after SMF ticks have been converted to an absolute ms clock. */
export type MidiTimelineEvent =
  | {
      ms: number;
      order: number;
      type: "noteon";
      channel: number;
      key: number;
      velocity: number;
    }
  | {
      ms: number;
      order: number;
      type: "noteoff";
      channel: number;
      key: number;
    }
  | {
      ms: number;
      order: number;
      type: "programchange";
      channel: number;
      preset: number;
    }
  | {
      ms: number;
      order: number;
      type: "controlchange";
      channel: number;
      control: number;
      value: number;
    }
  | {
      ms: number;
      order: number;
      type: "pitchbend";
      channel: number;
      value: number;
    };

export interface MidiTimeline {
  events: MidiTimelineEvent[];
  durationMs: number;
  activeChannels: Set<number>;
}

type WithTick<T> = T extends MidiTimelineEvent
  ? Omit<T, "ms"> & { tick: number }
  : never;
type RawEvent = WithTick<MidiTimelineEvent>;

interface RawTempo {
  tick: number;
  microsecondsPerBeat: number;
  order: number;
}

interface TempoSegment {
  tick: number;
  ms: number;
  microsecondsPerBeat: number;
}

const HEADER_MAGIC = 0x4d546864;
const TRACK_MAGIC = 0x4d54726b;
const EVENT_PRIORITY: Record<MidiTimelineEvent["type"], number> = {
  programchange: 1,
  controlchange: 2,
  pitchbend: 3,
  noteoff: 4,
  noteon: 5,
};

function assertReadable(offset: number, bytes: number, end: number): void {
  if (offset < 0 || bytes < 0 || offset + bytes > end) {
    throw new Error("MIDI file ended in the middle of an event");
  }
}

function readVariableLength(
  view: DataView,
  offset: number,
  end: number
): { value: number; nextOffset: number } {
  let value = 0;
  let nextOffset = offset;

  for (let index = 0; index < 4; index += 1) {
    assertReadable(nextOffset, 1, end);
    const byte = view.getUint8(nextOffset++);
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) return { value, nextOffset };
  }

  throw new Error("Invalid MIDI variable-length value");
}

function buildTempoSegments(tempos: RawTempo[], ppq: number): TempoSegment[] {
  const sorted = [
    { tick: 0, microsecondsPerBeat: 500_000, order: -1 },
    ...tempos,
  ].sort((a, b) => a.tick - b.tick || a.order - b.order);

  const segments: TempoSegment[] = [];
  let tick = 0;
  let ms = 0;
  let microsecondsPerBeat = 500_000;

  for (const tempo of sorted) {
    if (tempo.tick > tick) {
      ms +=
        ((tempo.tick - tick) * microsecondsPerBeat) /
        (Math.max(1, ppq) * 1000);
      tick = tempo.tick;
    }
    microsecondsPerBeat = tempo.microsecondsPerBeat;

    const previous = segments.at(-1);
    if (previous?.tick === tick) {
      previous.microsecondsPerBeat = microsecondsPerBeat;
      previous.ms = ms;
    } else {
      segments.push({ tick, ms, microsecondsPerBeat });
    }
  }

  return segments;
}

function tickToMs(tick: number, segments: TempoSegment[], ppq: number): number {
  let lo = 0;
  let hi = segments.length;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].tick <= tick) lo = mid;
    else hi = mid;
  }

  const segment = segments[lo];
  return (
    segment.ms +
    ((tick - segment.tick) * segment.microsecondsPerBeat) /
      (Math.max(1, ppq) * 1000)
  );
}

/**
 * Parse an entire Standard MIDI File into the same millisecond event model
 * used by karaoke-web-online's SequencerScheduler.
 *
 * This deliberately keeps program, bank/controller and pitch events instead
 * of relying on FluidSynth's asynchronous SMF player seek implementation.
 */
export function parseMidiTimeline(buffer: ArrayBuffer): MidiTimeline {
  const view = new DataView(buffer);
  assertReadable(0, 14, view.byteLength);
  if (view.getUint32(0) !== HEADER_MAGIC) {
    throw new Error("Invalid MIDI file header");
  }

  const headerLength = view.getUint32(4);
  if (headerLength < 6) throw new Error("Invalid MIDI header length");
  assertReadable(8, headerLength, view.byteLength);

  const trackCount = view.getUint16(10);
  const division = view.getUint16(12);
  const usesSmpte = (division & 0x8000) !== 0;
  const ppq = usesSmpte ? 1 : division;
  if (!usesSmpte && ppq === 0) throw new Error("MIDI PPQ cannot be zero");

  let smpteMsPerTick = 0;
  if (usesSmpte) {
    const encodedFps = (division >> 8) & 0xff;
    const signedFps = encodedFps >= 0x80 ? encodedFps - 0x100 : encodedFps;
    const framesPerSecond =
      Math.abs(signedFps) === 29 ? 29.97 : Math.abs(signedFps);
    const ticksPerFrame = division & 0xff;
    if (framesPerSecond === 0 || ticksPerFrame === 0) {
      throw new Error("Invalid SMPTE MIDI time division");
    }
    smpteMsPerTick = 1000 / (framesPerSecond * ticksPerFrame);
  }

  const rawEvents: RawEvent[] = [];
  const tempos: RawTempo[] = [];
  let order = 0;
  let maxTick = 0;
  let offset = 8 + headerLength;
  let parsedTracks = 0;

  while (parsedTracks < trackCount) {
    assertReadable(offset, 8, view.byteLength);
    const chunkMagic = view.getUint32(offset);
    const chunkLength = view.getUint32(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    assertReadable(chunkStart, chunkLength, view.byteLength);
    offset = chunkEnd;

    if (chunkMagic !== TRACK_MAGIC) continue;
    parsedTracks += 1;

    let eventOffset = chunkStart;
    let absoluteTick = 0;
    let runningStatus = 0;

    while (eventOffset < chunkEnd) {
      const delta = readVariableLength(view, eventOffset, chunkEnd);
      eventOffset = delta.nextOffset;
      absoluteTick += delta.value;
      maxTick = Math.max(maxTick, absoluteTick);
      assertReadable(eventOffset, 1, chunkEnd);

      let status = view.getUint8(eventOffset);
      if (status < 0x80) {
        if (runningStatus === 0) {
          throw new Error("MIDI running status has no preceding channel event");
        }
        status = runningStatus;
      } else {
        eventOffset += 1;
      }

      if (status === 0xff) {
        runningStatus = 0;
        assertReadable(eventOffset, 1, chunkEnd);
        const metaType = view.getUint8(eventOffset++);
        const length = readVariableLength(view, eventOffset, chunkEnd);
        eventOffset = length.nextOffset;
        assertReadable(eventOffset, length.value, chunkEnd);

        if (metaType === 0x51 && length.value === 3 && !usesSmpte) {
          const microsecondsPerBeat =
            (view.getUint8(eventOffset) << 16) |
            (view.getUint8(eventOffset + 1) << 8) |
            view.getUint8(eventOffset + 2);
          if (microsecondsPerBeat > 0) {
            tempos.push({
              tick: absoluteTick,
              microsecondsPerBeat,
              order: order++,
            });
          }
        }

        eventOffset += length.value;
        if (metaType === 0x2f) break;
        continue;
      }

      if (status === 0xf0 || status === 0xf7) {
        runningStatus = 0;
        const length = readVariableLength(view, eventOffset, chunkEnd);
        eventOffset = length.nextOffset;
        assertReadable(eventOffset, length.value, chunkEnd);
        eventOffset += length.value;
        continue;
      }

      const eventType = status >> 4;
      if (eventType < 0x8 || eventType > 0xe) {
        throw new Error(`Unsupported MIDI status 0x${status.toString(16)}`);
      }

      runningStatus = status;
      const channel = status & 0x0f;
      const dataLength = eventType === 0xc || eventType === 0xd ? 1 : 2;
      assertReadable(eventOffset, dataLength, chunkEnd);
      const data1 = view.getUint8(eventOffset++);
      const data2 = dataLength === 2 ? view.getUint8(eventOffset++) : 0;
      const eventOrder = order++;

      if (eventType === 0x9 && data2 > 0) {
        rawEvents.push({
          tick: absoluteTick,
          order: eventOrder,
          type: "noteon",
          channel,
          key: data1,
          velocity: data2,
        });
      } else if (eventType === 0x8 || (eventType === 0x9 && data2 === 0)) {
        rawEvents.push({
          tick: absoluteTick,
          order: eventOrder,
          type: "noteoff",
          channel,
          key: data1,
        });
      } else if (eventType === 0xc) {
        rawEvents.push({
          tick: absoluteTick,
          order: eventOrder,
          type: "programchange",
          channel,
          preset: data1,
        });
      } else if (eventType === 0xb && data1 !== 121) {
        rawEvents.push({
          tick: absoluteTick,
          order: eventOrder,
          type: "controlchange",
          channel,
          control: data1,
          value: data2,
        });
      } else if (eventType === 0xe) {
        rawEvents.push({
          tick: absoluteTick,
          order: eventOrder,
          type: "pitchbend",
          channel,
          value: (data2 << 7) | data1,
        });
      }
    }
  }

  const tempoSegments = usesSmpte ? [] : buildTempoSegments(tempos, ppq);
  const toMs = (tick: number) =>
    usesSmpte ? tick * smpteMsPerTick : tickToMs(tick, tempoSegments, ppq);

  const flat = rawEvents
    .map((event): MidiTimelineEvent => {
      const { tick, ...timelineEvent } = event;
      return { ...timelineEvent, ms: toMs(tick) } as MidiTimelineEvent;
    })
    .sort(
      (a, b) =>
        a.ms - b.ms ||
        EVENT_PRIORITY[a.type] - EVENT_PRIORITY[b.type] ||
        a.order - b.order
    );

  // Keep only the last pitch bend when a file emits several on the same tick.
  const deduped = flat.filter((event, index) => {
    if (event.type !== "pitchbend") return true;
    const next = flat[index + 1];
    return !(
      next?.type === "pitchbend" &&
      next.channel === event.channel &&
      Math.abs(next.ms - event.ms) < 0.0001
    );
  });

  // FluidSynth can leave a voice hanging if malformed karaoke MIDI repeats a
  // Note On without closing the previous note. Match the production parser's
  // repair pass before handing the events to the native sequencer.
  const events: MidiTimelineEvent[] = [];
  const openNotes = new Set<number>();
  for (const event of deduped) {
    if (event.type === "noteon") {
      const noteId = (event.channel << 8) | event.key;
      if (openNotes.has(noteId)) {
        events.push({
          ms: event.ms,
          order: event.order - 0.5,
          type: "noteoff",
          channel: event.channel,
          key: event.key,
        });
      }
      openNotes.add(noteId);
    } else if (event.type === "noteoff") {
      openNotes.delete((event.channel << 8) | event.key);
    }
    events.push(event);
  }

  let durationMs = Math.max(toMs(maxTick), events.at(-1)?.ms ?? 0);
  for (const noteId of openNotes) {
    durationMs += 1;
    events.push({
      ms: durationMs,
      order: order++,
      type: "noteoff",
      channel: noteId >> 8,
      key: noteId & 0xff,
    });
  }

  const activeChannels = new Set<number>();
  for (const event of events) activeChannels.add(event.channel);

  return { events, durationMs, activeChannels };
}

