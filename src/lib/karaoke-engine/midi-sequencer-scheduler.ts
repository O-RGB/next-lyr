import type { ISequencer, SequencerEvent } from "js-synthesizer";

import type { MidiTimeline, MidiTimelineEvent } from "./midi-timeline";

type MidiEventFilter = (event: MidiTimelineEvent) => boolean;

/**
 * Full-file scheduler based on karaoke-web-online's SequencerScheduler clock.
 *
 * Studio intentionally queues the complete remaining song on every start or
 * seek. FluidSynth then owns all event timing on its sample-driven sequencer;
 * no window/worker timer participates in MIDI playback.
 */
export class MidiSequencerScheduler {
  private timeline: MidiTimeline | null = null;

  constructor(
    private readonly sequencer: ISequencer,
    private readonly synthClientId: number,
    private readonly shouldSchedule: MidiEventFilter = () => true
  ) {}

  load(timeline: MidiTimeline | null): void {
    this.clear();
    this.timeline = timeline;
  }

  clear(): void {
    this.sequencer.removeAllEventsFromClient(this.synthClientId);
  }

  scheduleFrom(
    positionMs: number,
    tickSnapshot: number,
    playbackRate = 1
  ): boolean {
    const timeline = this.timeline;
    this.clear();
    if (!timeline || timeline.events.length === 0) return false;

    const targetMs = Math.max(0, Math.min(positionMs, timeline.durationMs));
    const boundaryTick = Math.ceil(tickSnapshot);
    const firstEvent = this.findEventIndex(targetMs);

    this.scheduleChasedState(firstEvent, boundaryTick);
    for (let index = firstEvent; index < timeline.events.length; index += 1) {
      const event = timeline.events[index];
      if (!this.shouldSchedule(event)) continue;
      const payload = toSequencerEvent(event);
      const tick =
        boundaryTick + Math.max(0, event.ms - targetMs) / Math.max(0.01, playbackRate);
      this.sequencer.sendEventToClientAt(
        this.synthClientId,
        payload,
        Math.round(tick),
        true
      );
    }
    return true;
  }

  private findEventIndex(positionMs: number): number {
    const events = this.timeline?.events ?? [];
    let lo = 0;
    let hi = events.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (events[mid].ms < positionMs) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /** Rehydrate program, controllers and pitch at a seek boundary. */
  private scheduleChasedState(eventIndex: number, tick: number): void {
    const events = this.timeline?.events ?? [];
    const programs = new Map<number, number>();
    const controls = new Map<number, MidiTimelineEvent & { type: "controlchange" }>();
    const pitchBends = new Map<number, number>();

    for (let index = 0; index < eventIndex; index += 1) {
      const event = events[index];
      if (event.type === "programchange") {
        programs.set(event.channel, event.preset);
      } else if (event.type === "controlchange") {
        if (!this.shouldSchedule(event)) continue;
        controls.set((event.channel << 8) | event.control, event);
      } else if (event.type === "pitchbend") {
        pitchBends.set(event.channel, event.value);
      }
    }

    // Bank select must reach FluidSynth before its matching program change.
    const sortedControls = [...controls.values()].sort((a, b) => {
      const bankPriority = (control: number) =>
        control === 0 ? 0 : control === 32 ? 1 : 2;
      return (
        bankPriority(a.control) - bankPriority(b.control) ||
        a.channel - b.channel ||
        a.control - b.control
      );
    });
    for (const event of sortedControls) {
      this.sequencer.sendEventToClientAt(
        this.synthClientId,
        toSequencerEvent(event),
        tick,
        true
      );
    }
    for (const [channel, preset] of programs) {
      this.sequencer.sendEventToClientAt(
        this.synthClientId,
        { type: "program-change", channel, preset },
        tick,
        true
      );
    }
    for (const [channel, value] of pitchBends) {
      this.sequencer.sendEventToClientAt(
        this.synthClientId,
        { type: "pitch-bend", channel, value },
        tick,
        true
      );
    }
  }
}

function toSequencerEvent(event: MidiTimelineEvent): SequencerEvent {
  switch (event.type) {
    case "noteon":
      return {
        type: "note-on",
        channel: event.channel,
        key: event.key,
        vel: event.velocity,
      };
    case "noteoff":
      return {
        type: "note-off",
        channel: event.channel,
        key: event.key,
      };
    case "programchange":
      return {
        type: "program-change",
        channel: event.channel,
        preset: event.preset,
      };
    case "controlchange":
      return {
        type: "control-change",
        channel: event.channel,
        control: event.control,
        value: event.value,
      };
    case "pitchbend":
      return {
        type: "pitch-bend",
        channel: event.channel,
        value: event.value,
      };
  }
}
