import pako from "pako";
import {
  MidiFile,
  MidiEvent,
  MidiTrack,
  IMidiParseResult,
  LyricEvent,
  ChordEvent,
  TempoEvent,
  TimeSignatureEvent,
} from "./types";
import {
  base64ToArrayBuffer,
  decodeKlyrXmlBytes,
  TIS620ToString,
  type KlyrTextEncoding,
} from "../shared/lib";
import { tempoToArrayRange } from "../lyrics/tempo-list";
import { parseKlyrXml } from "../lyrics-core/xml";
import type { LyricsDocument } from "../lyrics-core/types";

function readVariableLength(
  view: DataView,
  offset: number
): { value: number; nextOffset: number } {
  let value = 0;
  let byte;
  let currentOffset = offset;
  do {
    byte = view.getUint8(currentOffset++);
    value = (value << 7) | (byte & 0x7f);
  } while (byte & 0x80);
  return { value, nextOffset: currentOffset };
}

function _parseEvent(
  view: DataView,
  offset: number,
  runningStatus: number
): MidiEvent & { nextOffset: number } {
  let status = view.getUint8(offset);
  let isRunningStatus = false;

  if (status < 0x80) {
    if (!runningStatus) {
      console.warn("Running status expected but none set, forcing fallback");
      status = 0x90;
    } else {
      status = runningStatus;
      isRunningStatus = true;
    }
  }

  const eventType = status >> 4;
  let currentOffset = isRunningStatus ? offset : offset + 1;

  if (status === 0xff) {
    const metaType = view.getUint8(currentOffset++);
    const lengthResult = readVariableLength(view, currentOffset);
    currentOffset = lengthResult.nextOffset;
    const data = new Uint8Array(view.buffer, currentOffset, lengthResult.value);
    currentOffset += lengthResult.value;
    return {
      type: "meta",
      metaType,
      data,
      text: [1, 3, 5, 6].includes(metaType) ? TIS620ToString(data) : undefined,
      absoluteTime: 0,
      nextOffset: currentOffset,
    };
  } else if (eventType >= 0x8 && eventType <= 0xe) {
    const paramCount = eventType === 0xc || eventType === 0xd ? 1 : 2;
    const data = [];
    for (let i = 0; i < paramCount; i++) {
      data.push(view.getUint8(currentOffset++));
    }
    return {
      type: "channel",
      status,
      data,
      absoluteTime: 0,
      nextOffset: currentOffset,
    };
  } else if (status === 0xf0 || status === 0xf7) {
    const lengthResult = readVariableLength(view, currentOffset);
    currentOffset = lengthResult.nextOffset;
    const data = new Uint8Array(view.buffer, currentOffset, lengthResult.value);
    currentOffset += lengthResult.value;
    return { type: "sysex", data, absoluteTime: 0, nextOffset: currentOffset };
  } else {
    console.warn(
      `Unknown MIDI event at offset ${offset}, status=0x${status.toString(16)}`
    );
    return {
      type: "unknown",
      status,
      absoluteTime: 0,
      nextOffset: currentOffset,
    };
  }
}

function _parseMidiFile(buffer: ArrayBuffer): MidiFile {
  const view = new DataView(buffer);
  if (view.getUint32(0) !== 0x4d546864)
    throw new Error("Invalid MIDI file header");
  const headerLength = view.getUint32(4);
  const format = view.getUint16(8);
  const trackCount = view.getUint16(10);
  const ticksPerBeat = view.getUint16(12);
  let offset = 8 + headerLength;
  const tracks: MidiTrack[] = [];

  for (let i = 0; i < trackCount; i++) {
    if (view.getUint32(offset) !== 0x4d54726b)
      throw new Error("Invalid track header");
    const trackLength = view.getUint32(offset + 4);
    const trackEnd = offset + 8 + trackLength;
    offset += 8;
    const events: MidiEvent[] = [];
    let currentTime = 0;
    let runningStatus = 0;
    while (offset < trackEnd) {
      const deltaTimeResult = readVariableLength(view, offset);
      offset = deltaTimeResult.nextOffset;
      currentTime += deltaTimeResult.value;
      const eventResult = _parseEvent(view, offset, runningStatus);
      const event: MidiEvent = { ...eventResult, absoluteTime: currentTime };
      events.push(event);
      offset = eventResult.nextOffset;
      if (event.type === "channel") runningStatus = event.status;
      else runningStatus = 0;
    }
    tracks.push(events);
  }
  return { format, trackCount, ticksPerBeat, tracks };
}

function detectKlyrTextEncoding(midiData: MidiFile): KlyrTextEncoding {
  for (const track of midiData.tracks) {
    for (const event of track) {
      if (
        event.type !== "meta" ||
        event.metaType !== 0x01 ||
        !event.text ||
        !event.text.includes("LyrHdr")
      ) {
        continue;
      }

      const match = event.text.match(/(K?LyrHdr\d*)(.*)/i);
      if (!match?.[2]) continue;

      try {
        const compressed = base64ToArrayBuffer(match[2].trim());
        const decompressed = pako.inflate(compressed);
        return decodeKlyrXmlBytes(decompressed).encoding;
      } catch {
        return "tis-620";
      }
    }
  }

  return "tis-620";
}

function _extractDataFromEvents(
  midiData: MidiFile
): Omit<
  IMidiParseResult,
  "midiData" | "format" | "ticksPerBeat" | "trackCount" | "tracks"
> {
  let songInfo: any = {};
  let lyrics: LyricEvent[][] = [];
  let chords: ChordEvent[] = [];
  let tempoChanges: TempoEvent[] = [];
  let timeSignatures: TimeSignatureEvent[] = [];
  let lyricsDocument: LyricsDocument | undefined;
  let lyricsXml: string | undefined;
  let detectedHeader = "LyrHdr1";
  let foundLyrics = false;
  let firstNote: number | null = null;
  let duration = 0;
  const textEncoding = detectKlyrTextEncoding(midiData);

  midiData.tracks.forEach((track) => {
    track.forEach((event) => {
      if (event.absoluteTime > duration) {
        duration = event.absoluteTime;
      }

      if (
        event.type === "channel" &&
        event.status >= 0x90 &&
        event.status <= 0x9f
      ) {
        if ((event as any).data && (event as any).data[1] > 0) {
          if (firstNote === null || event.absoluteTime < firstNote) {
            firstNote = event.absoluteTime;
          }
        }
      }
      if (event.type !== "meta") return;
      if (event.metaType === 0x51 && event.data && event.data.length === 3) {
        const microsecondsPerBeat =
          (event.data[0] << 16) | (event.data[1] << 8) | event.data[2];
        const bpm = 60000000 / microsecondsPerBeat;
        tempoChanges.push({
          tick: event.absoluteTime,
          bpm: Math.round(bpm),
        });
      }

      if (event.metaType === 0x58 && event.data && event.data.length >= 2) {
        timeSignatures.push({
          tick: event.absoluteTime,
          numerator: event.data[0] || 4,
          denominator: 2 ** event.data[1],
        });
      }

      if (event.metaType === 0x06 && event.text) {
        const chord =
          textEncoding === "utf-8"
            ? new TextDecoder().decode(event.data)
            : TIS620ToString(event.data);
        chords.push({ chord, tick: event.absoluteTime });
      }
      if (
        !foundLyrics &&
        event.metaType === 0x01 &&
        event.text &&
        event.text.includes("LyrHdr")
      ) {
        const regex = /(K?LyrHdr\d*)(.*)/i;
        const match = event.text.match(regex);
        if (match && match[2]) {
          detectedHeader = match[1] || "LyrHdr1";
          const encodedPayload = match[2].trim();
          try {
            const compressed = base64ToArrayBuffer(encodedPayload);
            const decompressed = pako.inflate(compressed);
            const xmlText = decodeKlyrXmlBytes(decompressed).xml;
            if (typeof window !== "undefined") {
              const document = parseKlyrXml(xmlText, {
                source: "KMID",
                timeBase: {
                  kind: "midi-tick",
                  ppq: midiData.ticksPerBeat,
                },
              });
              lyricsDocument = document;
              lyricsXml = xmlText;
              songInfo = document.info;
              lyrics = document.lines.map((line) =>
                line
                  .filter((word) => word.at !== null)
                  .map((word) => ({
                    text: word.text,
                    tick: word.at!,
                    vocal: word.vocal,
                  }))
              );
              foundLyrics = true;
            }
          } catch (e) {
            console.error("Failed to parse KLyr data from meta event:", e);
            songInfo = {};
            lyrics = [];
          }
        }
      }
    });
  });

  chords.sort((a, b) => a.tick - b.tick);
  timeSignatures.sort((a, b) => a.tick - b.tick);

  if (timeSignatures.length === 0 || timeSignatures[0].tick > 0) {
    timeSignatures.unshift({ tick: 0, numerator: 4, denominator: 4 });
  }

  const tempos = tempoToArrayRange(tempoChanges, duration);

  return {
    info: songInfo,
    lyrics,
    chords,
    lyrHeader: detectedHeader,
    firstNote: firstNote ?? 0,
    tempos,
    timeSignatures,
    duration,
    lyricsDocument,
    lyricsXml,
  };
}

export function parse(arrayBuffer: ArrayBuffer): IMidiParseResult {
  const midiData = _parseMidiFile(arrayBuffer);
  const extracted = _extractDataFromEvents(midiData);
  return { ...midiData, ...extracted };
}

export async function parseMidi(
  input: File | Blob | ArrayBuffer
): Promise<IMidiParseResult> {
  if (input instanceof ArrayBuffer) {
    return parse(input);
  }
  const arrayBuffer = await input.arrayBuffer();
  return parse(arrayBuffer);
}
