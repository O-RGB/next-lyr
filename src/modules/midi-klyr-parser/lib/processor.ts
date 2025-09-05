// import pako from "pako";

// export interface MIDIOptionValue<T> {
//   label: string;
//   value: T;
// }

// export interface LyricEvent {
//   text: string;
//   tick: number;
//   vocal?: string;
// }
// export interface ChordEvent {
//   chord: string;
//   tick: number;
// }

// export type VOCAL_CHANNEL = "NONE" | "9" | "1" | "RIGHT";
// export const vocalChannelOption: MIDIOptionValue<VOCAL_CHANNEL>[] = [
//   {
//     label: "NONE",
//     value: "NONE",
//   },
//   {
//     label: "9",
//     value: "9",
//   },
//   {
//     label: "1",
//     value: "1",
//   },
//   {
//     label: "RIGHT",
//     value: "RIGHT",
//   },
// ];

// export type ARTIST_TYPE = "M" | "F" | "MF";
// export const artistTypeOption: MIDIOptionValue<ARTIST_TYPE>[] = [
//   {
//     label: "M",
//     value: "M",
//   },
//   {
//     label: "F",
//     value: "F",
//   },
//   {
//     label: "MF",
//     value: "MF",
//   },
// ];

// export type LANGUAGE = "DEFAULT" | "THAI" | "CHINESEBIG5";
// export const languageOption: MIDIOptionValue<LANGUAGE>[] = [
//   {
//     label: "DEFAULT",
//     value: "DEFAULT",
//   },
//   {
//     label: "THAI",
//     value: "THAI",
//   },
//   {
//     label: "CHINESEBIG5",
//     value: "CHINESEBIG5",
//   },
// ];

// export type KEY =
//   | "C"
//   | "Cm"
//   | "C#"
//   | "C#m"
//   | "D"
//   | "Dm"
//   | "Eb"
//   | "Ebm"
//   | "E"
//   | "Em"
//   | "F"
//   | "Fm"
//   | "F#"
//   | "F#m"
//   | "G"
//   | "Gm"
//   | "Ab"
//   | "Abm"
//   | "A"
//   | "Am"
//   | "Bb"
//   | "Bbm"
//   | "B"
//   | "Bm";
// export const keyOption: MIDIOptionValue<KEY>[] = [
//   {
//     label: "Cm",
//     value: "Cm",
//   },
//   {
//     label: "C#",
//     value: "C#",
//   },
//   {
//     label: "C#m",
//     value: "C#m",
//   },
//   {
//     label: "D",
//     value: "D",
//   },
//   {
//     label: "Dm",
//     value: "Dm",
//   },
//   {
//     label: "Eb",
//     value: "Eb",
//   },
//   {
//     label: "Ebm",
//     value: "Ebm",
//   },
//   {
//     label: "E",
//     value: "E",
//   },
//   {
//     label: "Em",
//     value: "Em",
//   },
//   {
//     label: "F",
//     value: "F",
//   },
//   {
//     label: "Fm",
//     value: "Fm",
//   },
//   {
//     label: "F#",
//     value: "F#",
//   },
//   {
//     label: "F#m",
//     value: "F#m",
//   },
//   {
//     label: "G",
//     value: "G",
//   },
//   {
//     label: "Gm",
//     value: "Gm",
//   },
//   {
//     label: "Ab",
//     value: "Ab",
//   },
//   {
//     label: "Abm",
//     value: "Abm",
//   },
//   {
//     label: "A",
//     value: "A",
//   },
//   {
//     label: "Am",
//     value: "Am",
//   },
//   {
//     label: "Bb",
//     value: "Bb",
//   },
//   {
//     label: "Bbm",
//     value: "Bbm",
//   },
//   {
//     label: "B",
//     value: "B",
//   },
//   {
//     label: "Bm",
//     value: "Bm",
//   },
// ];

// export interface SongInfo {
//   VERSION: string;
//   SOURCE: string;
//   CHARSET?: string;
//   TIME_FORMAT: string;
//   TITLE: string;
//   KEY?: KEY;
//   TEMPO?: string;
//   ALBUM?: string;
//   ARTIST: string;
//   ARTIST_TYPE?: ARTIST_TYPE;
//   AUTHOR?: string;
//   GENRE?: string;
//   RHYTHM?: string;
//   CREATOR?: string;
//   COMPANY?: string;
//   LANGUAGE: LANGUAGE;
//   YEAR?: string;
//   VOCAL_CHANNEL: VOCAL_CHANNEL;
//   LYRIC_TITLE?: string;
// }

// export const DEFAULT_SONG_INFO: SongInfo = {
//   VERSION: "1.1",
//   SOURCE: "LYRIC_EDITOR",
//   CHARSET: "TIS-620",
//   TIME_FORMAT: "",
//   TITLE: "",
//   KEY: "C",
//   TEMPO: "",
//   ALBUM: "",
//   ARTIST: "",
//   ARTIST_TYPE: "M",
//   AUTHOR: "",
//   GENRE: "",
//   RHYTHM: "",
//   CREATOR: "",
//   COMPANY: "",
//   LANGUAGE: "THAI",
//   YEAR: "",
//   VOCAL_CHANNEL: "9",
//   LYRIC_TITLE: "",
// };

// export interface ParseResult {
//   midiData: MidiFile;
//   info: SongInfo;
//   lyrics: LyricEvent[][];
//   chords: ChordEvent[];
//   detectedHeader: string;
//   firstNoteOnTick: number | null;
// }

// export interface BuildOptions {
//   originalMidiData: MidiFile;
//   newSongInfo: SongInfo;
//   newLyricsData: LyricEvent[][];
//   newChordsData: ChordEvent[];
//   headerToUse: string;
// }

// interface BaseMidiEvent {
//   absoluteTime: number;
// }
// interface MetaEvent extends BaseMidiEvent {
//   type: "meta";
//   metaType: number;
//   data: Uint8Array;
//   text?: string;
// }
// interface ChannelEvent extends BaseMidiEvent {
//   type: "channel";
//   status: number;
//   data: number[];
// }
// interface SysexEvent extends BaseMidiEvent {
//   type: "sysex";
//   data: Uint8Array;
// }
// interface UnknownEvent extends BaseMidiEvent {
//   type: "unknown";
//   status: number;
// }
// export type MidiEvent = MetaEvent | ChannelEvent | SysexEvent | UnknownEvent;
// export type MidiTrack = MidiEvent[];
// export interface MidiFile {
//   format: number;
//   trackCount: number;
//   ticksPerBeat: number;
//   tracks: MidiTrack[];
// }

// function stringToTIS620(str: string): Uint8Array {
//   const bytes = [];
//   for (let i = 0; i < str.length; i++) {
//     const char = str.charCodeAt(i);
//     if (char <= 127) {
//       bytes.push(char);
//     } else if (char >= 0x0e01 && char <= 0x0e5b) {
//       bytes.push(char - 0x0e01 + 0xa1);
//     } else {
//       bytes.push(0x3f);
//     }
//   }
//   return new Uint8Array(bytes);
// }

// function TIS620ToString(bytes: Uint8Array): string {
//   let str = "";
//   for (let i = 0; i < bytes.length; i++) {
//     const byte = bytes[i];
//     if (byte <= 127) {
//       str += String.fromCharCode(byte);
//     } else if (byte >= 0xa1 && byte <= 0xfb) {
//       str += String.fromCharCode(byte - 0xa1 + 0x0e01);
//     } else {
//       str += String.fromCharCode(0x3f);
//     }
//   }
//   return str;
// }

// function base64ToArrayBuffer(base64: string): ArrayBuffer {
//   const binaryString = atob(base64);
//   const bytes = new Uint8Array(binaryString.length);
//   for (let i = 0; i < binaryString.length; i++) {
//     bytes[i] = binaryString.charCodeAt(i);
//   }
//   return bytes.buffer;
// }

// function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
//   let u8arr: Uint8Array;
//   if (buffer instanceof ArrayBuffer) {
//     u8arr = new Uint8Array(buffer);
//   } else {
//     u8arr = buffer;
//   }

//   let binary = "";
//   const chunkSize = 0x8000;
//   for (let i = 0; i < u8arr.length; i += chunkSize) {
//     binary += String.fromCharCode(...u8arr.subarray(i, i + chunkSize));
//   }
//   return btoa(binary);
// }

// function writeVariableLength(value: number): number[] {
//   if (value < 0)
//     throw new Error("Cannot write negative variable-length quantity.");
//   if (value === 0) return [0];
//   const buffer: number[] = [];
//   while (value > 0) {
//     buffer.push(value & 0x7f);
//     value >>= 7;
//   }
//   const reversedBuffer = buffer.reverse();
//   for (let i = 0; i < reversedBuffer.length - 1; i++) reversedBuffer[i] |= 0x80;
//   return reversedBuffer;
// }

// function escapeXml(text: string): string {
//   return text.replace(/[<>&'"]/g, (c) => {
//     switch (c) {
//       case "<":
//         return "&lt;";
//       case ">":
//         return "&gt;";
//       case "&":
//         return "&amp;";
//       case "'":
//         return "&apos;";
//       case '"':
//         return "&quot;";
//       default:
//         return c;
//     }
//   });
// }

// function readVariableLength(
//   view: DataView,
//   offset: number
// ): { value: number; nextOffset: number } {
//   let value = 0;
//   let byte;
//   let currentOffset = offset;
//   do {
//     byte = view.getUint8(currentOffset++);
//     value = (value << 7) | (byte & 0x7f);
//   } while (byte & 0x80);
//   return { value, nextOffset: currentOffset };
// }

// function _parseEvent(
//   view: DataView,
//   offset: number,
//   runningStatus: number
// ): MidiEvent & { nextOffset: number } {
//   let status = view.getUint8(offset);
//   let isRunningStatus = false;

//   if (status < 0x80) {
//     if (!runningStatus) {
//       console.warn("Running status expected but none set, forcing fallback");

//       status = 0x90;
//     } else {
//       status = runningStatus;
//       isRunningStatus = true;
//     }
//   }

//   const eventType = status >> 4;
//   let currentOffset = isRunningStatus ? offset : offset + 1;

//   if (status === 0xff) {
//     const metaType = view.getUint8(currentOffset++);
//     const lengthResult = readVariableLength(view, currentOffset);
//     currentOffset = lengthResult.nextOffset;
//     const data = new Uint8Array(view.buffer, currentOffset, lengthResult.value);
//     currentOffset += lengthResult.value;
//     return {
//       type: "meta",
//       metaType,
//       data,
//       text: [1, 3, 5, 6].includes(metaType) ? TIS620ToString(data) : undefined,
//       absoluteTime: 0,
//       nextOffset: currentOffset,
//     };
//   } else if (eventType >= 0x8 && eventType <= 0xe) {
//     const paramCount = eventType === 0xc || eventType === 0xd ? 1 : 2;
//     const data = [];
//     for (let i = 0; i < paramCount; i++) {
//       data.push(view.getUint8(currentOffset++));
//     }
//     return {
//       type: "channel",
//       status,
//       data,
//       absoluteTime: 0,
//       nextOffset: currentOffset,
//     };
//   } else if (status === 0xf0 || status === 0xf7) {
//     const lengthResult = readVariableLength(view, currentOffset);
//     currentOffset = lengthResult.nextOffset;
//     const data = new Uint8Array(view.buffer, currentOffset, lengthResult.value);
//     currentOffset += lengthResult.value;
//     return { type: "sysex", data, absoluteTime: 0, nextOffset: currentOffset };
//   } else {
//     console.warn(
//       `Unknown MIDI event at offset ${offset}, status=0x${status.toString(16)}`
//     );
//     return {
//       type: "unknown",
//       status,
//       absoluteTime: 0,
//       nextOffset: currentOffset,
//     };
//   }
// }

// function _parseMidiFile(buffer: ArrayBuffer): MidiFile {
//   const view = new DataView(buffer);
//   if (view.getUint32(0) !== 0x4d546864)
//     throw new Error("Invalid MIDI file header");
//   const headerLength = view.getUint32(4);
//   const format = view.getUint16(8);
//   const trackCount = view.getUint16(10);
//   const ticksPerBeat = view.getUint16(12);
//   let offset = 8 + headerLength;
//   const tracks: MidiTrack[] = [];

//   for (let i = 0; i < trackCount; i++) {
//     if (view.getUint32(offset) !== 0x4d54726b)
//       throw new Error("Invalid track header");
//     const trackLength = view.getUint32(offset + 4);
//     const trackEnd = offset + 8 + trackLength;
//     offset += 8;
//     const events: MidiEvent[] = [];
//     let currentTime = 0;
//     let runningStatus = 0;
//     while (offset < trackEnd) {
//       const deltaTimeResult = readVariableLength(view, offset);
//       offset = deltaTimeResult.nextOffset;
//       currentTime += deltaTimeResult.value;
//       const eventResult = _parseEvent(view, offset, runningStatus);
//       const event: MidiEvent = { ...eventResult, absoluteTime: currentTime };
//       events.push(event);
//       offset = eventResult.nextOffset;
//       if (event.type === "channel") runningStatus = event.status;
//       else runningStatus = 0;
//     }
//     tracks.push(events);
//   }
//   return { format, trackCount, ticksPerBeat, tracks };
// }

// interface KlyrWord {
//   tick: number;
//   name: string;
//   vocal?: string;
// }

// function _parseKLyrXML(xmlDoc: Document): {
//   info: SongInfo;
//   lyrics: KlyrWord[][];
// } {
//   const info: any = {};
//   const infoNode = xmlDoc.querySelector("INFO");
//   if (infoNode) {
//     for (const child of Array.from(infoNode.children)) {
//       info[child.tagName] = child.textContent || "";
//     }
//   }
//   const lyrics: KlyrWord[][] = [];
//   const lyricNodes = xmlDoc.querySelectorAll("LYRIC LINE");
//   lyricNodes.forEach((lineNode) => {
//     const words: KlyrWord[] = [];
//     lineNode.querySelectorAll("WORD").forEach((wordNode) => {
//       const timeNode = wordNode.querySelector("TIME");
//       const textNode = wordNode.querySelector("TEXT");
//       const vocalNode = wordNode.querySelector("VOCAL");
//       if (timeNode && textNode) {
//         words.push({
//           tick: parseInt(timeNode.textContent || "0", 10),
//           name: textNode.textContent || "",
//           vocal: vocalNode ? vocalNode.textContent || "" : "",
//         });
//       }
//     });
//     if (words.length > 0) lyrics.push(words);
//   });
//   return { info, lyrics };
// }

// function _extractDataFromEvents(
//   midiData: MidiFile
// ): Omit<ParseResult, "midiData"> {
//   let songInfo: any = {};
//   let lyrics: LyricEvent[][] = [];
//   let chords: ChordEvent[] = [];
//   let detectedHeader = "LyrHdr1";
//   let foundLyrics = false;
//   let firstNoteOnTick: number | null = null;

//   midiData.tracks.forEach((track) => {
//     track.forEach((event) => {
//       if (
//         event.type === "channel" &&
//         event.status >= 0x90 &&
//         event.status <= 0x9f
//       ) {
//         const channelEvent = event as ChannelEvent;

//         if (channelEvent.data && channelEvent.data[1] > 0) {
//           if (
//             firstNoteOnTick === null ||
//             event.absoluteTime < firstNoteOnTick
//           ) {
//             firstNoteOnTick = event.absoluteTime;
//           }
//         }
//       }

//       if (event.type !== "meta") return;
//       if (event.metaType === 0x06 && event.text) {
//         chords.push({ chord: event.text, tick: event.absoluteTime });
//       }
//       if (
//         !foundLyrics &&
//         event.metaType === 0x01 &&
//         event.text &&
//         event.text.includes("LyrHdr")
//       ) {
//         const regex = /(K?LyrHdr\d*)(.*)/i;
//         const match = event.text.match(regex);
//         if (match && match[2]) {
//           detectedHeader = match[1] || "LyrHdr1";
//           const encodedPayload = match[2].trim();
//           try {
//             const compressed = base64ToArrayBuffer(encodedPayload);
//             const decompressed = pako.inflate(compressed);
//             const xmlText = TIS620ToString(decompressed);
//             if (typeof window !== "undefined") {
//               const parser = new DOMParser();
//               const xmlDoc = parser.parseFromString(xmlText, "text/xml");
//               const klyrData = _parseKLyrXML(xmlDoc);
//               songInfo = klyrData.info;
//               lyrics = klyrData.lyrics.map((line) =>
//                 line.map((word) => ({ text: word.name, tick: word.tick }))
//               );
//               foundLyrics = true;
//             }
//           } catch (e) {
//             console.error("Failed to parse KLyr data from meta event:", e);
//             songInfo = {};
//             lyrics = [];
//           }
//         }
//       }
//     });
//   });

//   chords.sort((a, b) => a.tick - b.tick);
//   return { info: songInfo, lyrics, chords, detectedHeader, firstNoteOnTick };
// }

// function _buildKLyrXML(infoData: SongInfo, lyricsData: LyricEvent[][]): string {
//   let xml = '<?xml version="1.0" encoding="UTF-8"?>\r\n<SONG_LYRIC>\r\n';
//   const escapeXml = (str: string) =>
//     String(str)
//       .replace(/&/g, "&amp;")
//       .replace(/</g, "&lt;")
//       .replace(/>/g, "&gt;")
//       .replace(/"/g, "&quot;")
//       .replace(/'/g, "&#39;");
//   if (infoData && Object.keys(infoData).length > 0) {
//     xml += "  <INFO>\r\n";
//     for (const [key, value] of Object.entries(infoData)) {
//       xml += `    <${key}>${escapeXml(value)}</${key}>\r\n`;
//     }
//     xml += "  </INFO>\r\n";
//   }
//   if (lyricsData?.length > 0) {
//     xml += "  <LYRIC>\r\n";
//     lyricsData.forEach((line) => {
//       if (line.length > 0) {
//         xml += "    <LINE>\r\n";
//         xml += `      <TIME>${line[0].tick}</TIME>\r\n`;
//         line.forEach((word) => {
//           xml += "      <WORD>\r\n";
//           xml += `        <TIME>${word.tick}</TIME>\r\n`;
//           xml += `        <TEXT>${escapeXml(word.text)}</TEXT>\r\n`;
//           if (word.vocal === "9" || word.vocal === "NONE") {
//             xml += `        <VOCAL></VOCAL>\r\n`;
//           } else {
//             xml += `        <VOCAL>${
//               word.vocal ? escapeXml(word.vocal) : ""
//             }</VOCAL>\r\n`;
//           }
//           xml += "      </WORD>\r\n";
//         });
//         xml += "    </LINE>\r\n";
//       }
//     });
//     xml += "  </LYRIC>\r\n";
//   }
//   xml += "</SONG_LYRIC>\r\n";

//   console.log(xml);
//   return xml;
// }

// function _encodeKLyrPayload(xml: string): string {
//   const xmlBytes = stringToTIS620(xml);
//   const compressed = pako.deflate(xmlBytes, { level: 9 });
//   return arrayBufferToBase64(compressed);
// }

// function _createModifiedMidi(
//   options: BuildOptions
// ): Omit<MidiFile, "trackCount"> {
//   const {
//     originalMidiData,
//     newSongInfo,
//     newLyricsData,
//     newChordsData,
//     headerToUse,
//   } = options;
//   const { format, ticksPerBeat } = originalMidiData;

//   let workingTracks = originalMidiData.tracks.map((track) =>
//     track.filter((event) => !(event.type === "meta" && event.metaType === 0x06))
//   );

//   const otherTracks = workingTracks.filter(
//     (track) =>
//       !track.some(
//         (event) =>
//           (event.type === "meta" &&
//             event.metaType === 0x03 &&
//             event.text?.trim() === "@LYRIC") ||
//           (event.type === "meta" &&
//             event.metaType === 0x01 &&
//             event.text?.match(/K?LyrHdr\d*/i))
//       )
//   );

//   if (newChordsData && newChordsData.length > 0) {
//     let targetTrackIndex = otherTracks.findIndex((track) =>
//       track.some((e) => e.type === "meta" && e.metaType === 0x51)
//     );
//     if (targetTrackIndex === -1 && otherTracks.length > 0) targetTrackIndex = 0;
//     if (targetTrackIndex !== -1) {
//       const newMarkerEvents: MidiEvent[] = newChordsData.map((chord) => ({
//         type: "meta",
//         metaType: 0x06,
//         text: chord.chord.trim(),
//         absoluteTime: chord.tick,
//         data: new Uint8Array(),
//       }));
//       otherTracks[targetTrackIndex].push(...newMarkerEvents);
//       otherTracks[targetTrackIndex].sort(
//         (a, b) => a.absoluteTime - b.absoluteTime
//       );
//     }
//   }

//   const finalTracks = [...otherTracks];
//   if (
//     (newSongInfo && Object.keys(newSongInfo).length > 0) ||
//     (newLyricsData && newLyricsData.length > 0)
//   ) {
//     const klyrXml = _buildKLyrXML(newSongInfo, newLyricsData);
//     const encodedKLyr = _encodeKLyrPayload(klyrXml);
//     const newLyricTrack: MidiTrack = [
//       {
//         type: "meta",
//         metaType: 0x03,
//         text: "@LYRIC",
//         absoluteTime: 0,
//         data: new Uint8Array(),
//       },
//       {
//         type: "meta",
//         metaType: 0x01,
//         text: headerToUse + encodedKLyr,
//         absoluteTime: 1,
//         data: new Uint8Array(),
//       },
//     ];
//     finalTracks.push(newLyricTrack);
//   }

//   return { format, ticksPerBeat, tracks: finalTracks };
// }

// function _buildTrackData(track: MidiTrack): Uint8Array {
//   const chunks: number[] = [];
//   let currentTime = 0;
//   let lastStatus: number | null = null;

//   track.forEach((event) => {
//     const deltaTime = event.absoluteTime - currentTime;
//     chunks.push(...writeVariableLength(deltaTime));
//     currentTime = event.absoluteTime;

//     if (event.type === "meta") {
//       chunks.push(0xff, event.metaType);
//       const data =
//         event.text !== undefined
//           ? stringToTIS620(event.text)
//           : event.data || new Uint8Array(0);
//       chunks.push(...writeVariableLength(data.length));
//       chunks.push(...Array.from(data));
//       lastStatus = null;
//     } else if (event.type === "channel") {
//       if (event.status !== lastStatus) {
//         chunks.push(event.status);
//         lastStatus = event.status;
//       }
//       chunks.push(...event.data);
//     } else if (event.type === "sysex") {
//       chunks.push(0xf0);
//       chunks.push(...writeVariableLength(event.data.length));
//       chunks.push(...event.data);
//       lastStatus = null;
//     }
//   });

//   if (!track.some((e) => e.type === "meta" && e.metaType === 0x2f)) {
//     chunks.push(0x00, 0xff, 0x2f, 0x00);
//   }

//   return new Uint8Array(chunks);
// }

// function _buildMidiFile(
//   midiStructure: Omit<MidiFile, "trackCount">
// ): Uint8Array {
//   const { format, ticksPerBeat, tracks } = midiStructure;
//   const trackBuffers: Uint8Array[] = tracks.map(_buildTrackData);
//   const totalLength =
//     14 + trackBuffers.reduce((sum, buf) => sum + 8 + buf.length, 0);
//   const output = new Uint8Array(totalLength);
//   const view = new DataView(output.buffer);

//   let offset = 0;
//   const writeString = (str: string) => {
//     for (let i = 0; i < str.length; i++) output[offset++] = str.charCodeAt(i);
//   };

//   writeString("MThd");
//   view.setUint32(offset, 6);
//   offset += 4;
//   view.setUint16(offset, format);
//   offset += 2;
//   view.setUint16(offset, tracks.length);
//   offset += 2;
//   view.setUint16(offset, ticksPerBeat);
//   offset += 2;

//   for (const trackBuffer of trackBuffers) {
//     writeString("MTrk");
//     view.setUint32(offset, trackBuffer.length);
//     offset += 4;
//     output.set(trackBuffer, offset);
//     offset += trackBuffer.length;
//   }

//   return output;
// }

// export function parse(arrayBuffer: ArrayBuffer): ParseResult {
//   const midiData = _parseMidiFile(arrayBuffer);
//   const extracted = _extractDataFromEvents(midiData);
//   return { midiData, ...extracted };
// }

// export function buildModifiedMidi(options: BuildOptions): Uint8Array {
//   const modified = _createModifiedMidi(options);
//   return _buildMidiFile(modified);
// }

// export async function loadMidiFile(file: File | Blob): Promise<ParseResult> {
//   const arrayBuffer = await file.arrayBuffer();
//   return parse(arrayBuffer);
// }

// export {
//   stringToTIS620,
//   TIS620ToString,
//   base64ToArrayBuffer,
//   arrayBufferToBase64,
// };
