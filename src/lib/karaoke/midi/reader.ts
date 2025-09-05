import pako from "pako";
import {
  MidiFile,
  MidiEvent,
  MidiTrack,
  IMidiParseResult,
  SongInfo,
  LyricEvent,
  ChordEvent,
} from "./types";
import { base64ToArrayBuffer, TIS620ToString } from "../shared/lib";

interface KlyrWord {
  tick: number;
  name: string;
  vocal?: string;
}

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
      status = 0x90; // Fallback to Note On on channel 0
    } else {
      status = runningStatus;
      isRunningStatus = true;
    }
  }

  const eventType = status >> 4;
  let currentOffset = isRunningStatus ? offset : offset + 1;

  if (status === 0xff) {
    // Meta Event
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
    // Channel Event
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
    // Sysex Event
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

function _parseKLyrXML(xmlDoc: Document): {
  info: SongInfo;
  lyrics: KlyrWord[][];
} {
  const info: any = {};
  const infoNode = xmlDoc.querySelector("INFO");
  if (infoNode) {
    for (const child of Array.from(infoNode.children)) {
      info[child.tagName] = child.textContent || "";
    }
  }
  const lyrics: KlyrWord[][] = [];
  const lyricNodes = xmlDoc.querySelectorAll("LYRIC LINE");
  lyricNodes.forEach((lineNode) => {
    const words: KlyrWord[] = [];
    lineNode.querySelectorAll("WORD").forEach((wordNode) => {
      const timeNode = wordNode.querySelector("TIME");
      const textNode = wordNode.querySelector("TEXT");
      const vocalNode = wordNode.querySelector("VOCAL");
      if (timeNode && textNode) {
        words.push({
          tick: parseInt(timeNode.textContent || "0", 10),
          name: textNode.textContent || "",
          vocal: vocalNode ? vocalNode.textContent || "" : "",
        });
      }
    });
    if (words.length > 0) lyrics.push(words);
  });
  return { info, lyrics };
}

function _extractDataFromEvents(
  midiData: MidiFile
): Omit<IMidiParseResult, "midiData"> {
  let songInfo: any = {};
  let lyrics: LyricEvent[][] = [];
  let chords: ChordEvent[] = [];
  let detectedHeader = "LyrHdr1";
  let foundLyrics = false;
  let firstNoteOnTick: number | null = null;

  midiData.tracks.forEach((track) => {
    track.forEach((event) => {
      if (
        event.type === "channel" &&
        event.status >= 0x90 &&
        event.status <= 0x9f
      ) {
        if ((event as any).data && (event as any).data[1] > 0) {
          if (
            firstNoteOnTick === null ||
            event.absoluteTime < firstNoteOnTick
          ) {
            firstNoteOnTick = event.absoluteTime;
          }
        }
      }

      if (event.type !== "meta") return;
      if (event.metaType === 0x06 && event.text) {
        chords.push({ chord: event.text, tick: event.absoluteTime });
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
            const xmlText = TIS620ToString(decompressed);
            if (typeof window !== "undefined") {
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(xmlText, "text/xml");
              const klyrData = _parseKLyrXML(xmlDoc);
              songInfo = klyrData.info;
              lyrics = klyrData.lyrics.map((line) =>
                line.map((word) => ({ text: word.name, tick: word.tick }))
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
  return { info: songInfo, lyrics, chords, detectedHeader, firstNoteOnTick };
}

export function parse(arrayBuffer: ArrayBuffer): IMidiParseResult {
  const midiData = _parseMidiFile(arrayBuffer);
  const extracted = _extractDataFromEvents(midiData);
  return { midiData, ...extracted };
}

export async function loadMidiFile(
  file: File | Blob
): Promise<IMidiParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  return parse(arrayBuffer);
}
