// lib/midiProcessor.ts
// A modern, modular version of the MIDI processing library.
import pako from "pako";

// --- Type Definitions (integrated into the module) ---

// User-facing types for parse result and build options
export interface LyricEvent {
  text: string;
  tick: number;
}
export interface ChordEvent {
  chord: string;
  tick: number;
}
export type SongInfo = Record<string, string>;

export interface ParseResult {
  midiData: MidiFile;
  info: SongInfo;
  lyrics: LyricEvent[][];
  chords: ChordEvent[];
  detectedHeader: string;
}

export interface BuildOptions {
  originalMidiData: MidiFile;
  newSongInfo: SongInfo;
  newLyricsData: LyricEvent[][];
  newChordsData: ChordEvent[];
  headerToUse: string;
}

// Internal types for processing
interface BaseMidiEvent {
  absoluteTime: number;
}
interface MetaEvent extends BaseMidiEvent {
  type: "meta";
  metaType: number;
  data: Uint8Array;
  text?: string;
}
interface ChannelEvent extends BaseMidiEvent {
  type: "channel";
  status: number;
  data: number[];
}
interface SysexEvent extends BaseMidiEvent {
  type: "sysex";
  data: Uint8Array;
}
interface UnknownEvent extends BaseMidiEvent {
  type: "unknown";
  status: number;
}
export type MidiEvent = MetaEvent | ChannelEvent | SysexEvent | UnknownEvent;
export type MidiTrack = MidiEvent[];
export interface MidiFile {
  format: number;
  trackCount: number;
  ticksPerBeat: number;
  tracks: MidiTrack[];
}

// --- Private Utility Functions ---

function stringToTIS620(str: string): Uint8Array {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    if (char <= 127) {
      bytes.push(char);
    } else if (char >= 0x0e01 && char <= 0x0e5b) {
      bytes.push(char - 0x0e01 + 0xa1);
    } else {
      bytes.push(0x3f);
    }
  }
  return new Uint8Array(bytes);
}

function TIS620ToString(bytes: Uint8Array): string {
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte <= 127) {
      str += String.fromCharCode(byte);
    } else if (byte >= 0xa1 && byte <= 0xfb) {
      str += String.fromCharCode(byte - 0xa1 + 0x0e01);
    } else {
      str += String.fromCharCode(0x3f);
    }
  }
  return str;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  let u8arr: Uint8Array;
  if (buffer instanceof ArrayBuffer) {
    u8arr = new Uint8Array(buffer);
  } else {
    u8arr = buffer;
  }

  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < u8arr.length; i += chunkSize) {
    binary += String.fromCharCode(...u8arr.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function writeVariableLength(value: number): number[] {
  if (value < 0) {
    throw new Error("Cannot write negative variable-length quantity.");
  }
  if (value === 0) {
    return [0];
  }

  const buffer: number[] = [];
  while (value > 0) {
    buffer.push(value & 0x7f);
    value >>= 7;
  }

  const reversedBuffer = buffer.reverse();

  for (let i = 0; i < reversedBuffer.length - 1; i++) {
    reversedBuffer[i] |= 0x80;
  }

  return reversedBuffer;
}

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

// --- Private Core Logic Functions ---

function _parseEvent(
  view: DataView,
  offset: number,
  runningStatus: number
): MidiEvent & { nextOffset: number } {
  let status = view.getUint8(offset);
  let isRunningStatus = false;
  if (status < 0x80) {
    if (!runningStatus) throw new Error("Running status expected but none set");
    status = runningStatus;
    isRunningStatus = true;
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
    return {
      type: "unknown",
      status,
      absoluteTime: 0,
      nextOffset: currentOffset,
    };
  }
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
      if (event.type === "channel") {
        runningStatus = event.status;
      } else {
        runningStatus = 0;
      }
    }
    tracks.push(events);
  }
  return { format, trackCount, ticksPerBeat, tracks };
}

// Internal type for parsing XML which has more fields
interface KlyrWord {
  tick: number;
  name: string;
  vocal?: string;
}

function _parseKLyrXML(xmlDoc: Document): {
  info: SongInfo;
  lyrics: KlyrWord[][];
} {
  const info: SongInfo = {};
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
): Omit<ParseResult, "midiData"> {
  let songInfo: SongInfo = {};
  let lyrics: LyricEvent[][] = [];
  let chords: ChordEvent[] = [];
  let detectedHeader = "LyrHdr1"; // Default
  let foundLyrics = false;

  midiData.tracks.forEach((track) => {
    track.forEach((event) => {
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
              // ** DATA TRANSFORMATION HAPPENS HERE **
              lyrics = klyrData.lyrics.map((line) =>
                line.map((word) => ({
                  text: word.name,
                  tick: word.tick,
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

  return { info: songInfo, lyrics, chords, detectedHeader };
}

function _buildKLyrXML(infoData: SongInfo, lyricsData: LyricEvent[][]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<SONG_LYRIC>\n';
  if (infoData && Object.keys(infoData).length > 0) {
    xml += "<INFO>\n";
    for (const [key, value] of Object.entries(infoData)) {
      xml += `<${key}>${escapeXml(String(value))}</${key}>\n`;
    }
    xml += "</INFO>\n";
  }
  if (lyricsData && lyricsData.length > 0) {
    xml += "<LYRIC>\n";
    lyricsData.forEach((line) => {
      if (line.length > 0) {
        xml += "<LINE>\n";
        xml += `<TIME>${line[0].tick}</TIME>\n`;
        line.forEach((word) => {
          // word is now LyricEvent
          xml += "<WORD>\n";
          xml += `<TIME>${word.tick}</TIME>\n`;
          xml += `<TEXT>${escapeXml(word.text)}</TEXT>\n`; // Use .text
          xml += `<VOCAL></VOCAL>\n`; // Vocal is always empty
          xml += "</WORD>\n";
        });
        xml += "</LINE>\n";
      }
    });
    xml += "</LYRIC>\n";
  }
  xml += "</SONG_LYRIC>";
  return xml;
}

function _encodeKLyrPayload(xml: string): string {
  const xmlBytes = stringToTIS620(xml);
  const compressed = pako.deflate(xmlBytes, { level: 9 });
  return arrayBufferToBase64(compressed);
}

function _createModifiedMidi(
  options: BuildOptions
): Omit<MidiFile, "trackCount"> {
  const {
    originalMidiData,
    newSongInfo,
    newLyricsData,
    newChordsData,
    headerToUse,
  } = options;
  const { format, ticksPerBeat } = originalMidiData;

  let workingTracks = originalMidiData.tracks.map((track) =>
    track.filter((event) => !(event.type === "meta" && event.metaType === 0x06))
  );

  const otherTracks = workingTracks.filter(
    (track) =>
      !track.some(
        (event) =>
          (event.type === "meta" &&
            event.metaType === 0x03 &&
            event.text?.trim() === "@LYRIC") ||
          (event.type === "meta" &&
            event.metaType === 0x01 &&
            event.text?.match(/K?LyrHdr\d*/i))
      )
  );

  if (newChordsData && newChordsData.length > 0) {
    let targetTrackIndex = otherTracks.findIndex((track) =>
      track.some((e) => e.type === "meta" && e.metaType === 0x51)
    );
    if (targetTrackIndex === -1 && otherTracks.length > 0) targetTrackIndex = 0;

    if (targetTrackIndex !== -1) {
      const newMarkerEvents: MidiEvent[] = newChordsData.map((chord) => ({
        type: "meta",
        metaType: 0x06,
        text: chord.chord.trim(),
        absoluteTime: chord.tick,
        data: new Uint8Array(),
      }));
      otherTracks[targetTrackIndex].push(...newMarkerEvents);
      otherTracks[targetTrackIndex].sort(
        (a, b) => a.absoluteTime - b.absoluteTime
      );
    }
  }

  const finalTracks = [...otherTracks];
  if (
    (newSongInfo && Object.keys(newSongInfo).length > 0) ||
    (newLyricsData && newLyricsData.length > 0)
  ) {
    const klyrXml = _buildKLyrXML(newSongInfo, newLyricsData);
    const encodedKLyr = _encodeKLyrPayload(klyrXml);
    const newLyricTrack: MidiTrack = [
      {
        type: "meta",
        metaType: 0x03,
        text: "@LYRIC",
        absoluteTime: 0,
        data: new Uint8Array(),
      },
      {
        type: "meta",
        metaType: 0x01,
        text: headerToUse + encodedKLyr,
        absoluteTime: 1,
        data: new Uint8Array(),
      },
    ];
    finalTracks.push(newLyricTrack);
  }

  return { format, ticksPerBeat, tracks: finalTracks };
}

function _buildTrackData(track: MidiTrack): Uint8Array {
  const chunks: number[] = [];
  let currentTime = 0;
  let lastStatus: number | null = null;

  track.forEach((event) => {
    const deltaTime = event.absoluteTime - currentTime;
    chunks.push(...writeVariableLength(deltaTime));
    currentTime = event.absoluteTime;

    if (event.type === "meta") {
      chunks.push(0xff, event.metaType);
      const data =
        event.text !== undefined
          ? stringToTIS620(event.text)
          : event.data || new Uint8Array(0);
      chunks.push(...writeVariableLength(data.length));
      chunks.push(...Array.from(data));
      lastStatus = null;
    } else if (event.type === "channel") {
      if (event.status !== lastStatus) {
        chunks.push(event.status);
        lastStatus = event.status;
      }
      chunks.push(...event.data);
    } else if (event.type === "sysex") {
      chunks.push(0xf0);
      chunks.push(...writeVariableLength(event.data.length));
      chunks.push(...event.data);
      lastStatus = null;
    }
  });

  if (!track.some((e) => e.type === "meta" && e.metaType === 0x2f)) {
    chunks.push(0x00, 0xff, 0x2f, 0x00);
  }

  return new Uint8Array(chunks);
}

function _buildMidiFile(
  midiStructure: Omit<MidiFile, "trackCount">
): ArrayBuffer {
  const trackDataChunks = midiStructure.tracks.map(_buildTrackData);
  const totalSize =
    14 + trackDataChunks.reduce((sum, chunk) => sum + 8 + chunk.length, 0);
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let offset = 0;

  view.setUint32(offset, 0x4d546864); // MThd
  view.setUint32(offset + 4, 6);
  view.setUint16(offset + 8, midiStructure.format);
  view.setUint16(offset + 10, midiStructure.tracks.length);
  view.setUint16(offset + 12, midiStructure.ticksPerBeat);
  offset += 14;

  trackDataChunks.forEach((trackBytes) => {
    view.setUint32(offset, 0x4d54726b); // MTrk
    view.setUint32(offset + 4, trackBytes.length);
    offset += 8;
    new Uint8Array(buffer, offset, trackBytes.length).set(trackBytes);
    offset += trackBytes.length;
  });

  return buffer;
}

// --- Public API ---

export function parse(arrayBuffer: ArrayBuffer): ParseResult {
  const midiData = _parseMidiFile(arrayBuffer);
  const extractedData = _extractDataFromEvents(midiData);
  return {
    midiData,
    info: extractedData.info,
    lyrics: extractedData.lyrics,
    chords: extractedData.chords,
    detectedHeader: extractedData.detectedHeader,
  };
}

export function build(options: BuildOptions): ArrayBuffer {
  const newMidiStructure = _createModifiedMidi(options);
  return _buildMidiFile(newMidiStructure);
}
