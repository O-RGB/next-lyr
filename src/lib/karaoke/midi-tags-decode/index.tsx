// // file: MidiParser.ts

// import { SongInfo } from "@/modules/midi-klyr-parser/lib/processor";
// import pako from "pako";

// // --- Interfaces ---
// export interface LyricEvent {
//   text: string;
//   tick: number;
// }

// export interface ChordEvent {
//   chord: string;
//   tick: number;
// }

// export interface MidiParseResult {
//   info: SongInfo;
//   lyrics: LyricEvent[][];
//   chords: ChordEvent[];
// }
// interface VlqResult {
//   value: number;
//   nextPos: number;
// }

// /**
//  * A comprehensive, single-pass MIDI parser for karaoke files.
//  * It extracts song info, timed lyrics, and chords by calling a single method.
//  */
// export class MidiDecode {
//   private midiData: Uint8Array;
//   private result: MidiParseResult;

//   private static readonly KLYR_HEADER = new Uint8Array([
//     0x4b, 0x4c, 0x79, 0x72, 0x48, 0x64, 0x72, 0x31,
//   ]); // "KLyrHdr1"
//   private static readonly MTRK_HEADER = new Uint8Array([
//     0x4d, 0x54, 0x72, 0x6b,
//   ]); // "MTrk"
//   private static readonly INFO_FIELDS = [
//     "VERSION",
//     "SOURCE",
//     "CHARSET",
//     "TIME_FORMAT",
//     "TITLE",
//     "KEY",
//     "TEMPO",
//     "ALBUM",
//     "ARTIST",
//     "ARTIST_TYPE",
//     "AUTHOR",
//     "GENRE",
//     "RHYTHM",
//     "CREATOR",
//     "COMPANY",
//     "LANGUAGE",
//     "YEAR",
//     "VOCAL_CHANNEL",
//     "LYRIC_TITLE",
//   ];

//   constructor(midiFileBuffer: ArrayBuffer) {
//     this.midiData = new Uint8Array(midiFileBuffer);
//     this.result = {
//       info: {},
//       lyrics: [],
//       chords: [],
//     };
//   }

//   /**
//    * Parses all available data (info, lyrics, and chords) from the MIDI file.
//    * This is the main entry point for the parser.
//    * @returns A promise that resolves to a MidiParseResult object.
//    */
//   public async parse(): Promise<MidiParseResult> {
//     this._parseKaraokeBlock(); // Handles Info and Lyrics
//     this._parseChords(); // Handles Chords

//     console.log(
//       `Parsing complete. Found ${
//         Object.keys(this.result.info).length
//       } info fields, ${this.result.lyrics.length} lyric events, and ${
//         this.result.chords.length
//       } chords.`
//     );
//     return this.result;
//   }

//   // --- Private Parsing Methods ---

//   /**
//    * Finds and processes the proprietary "KLyrHdr1" block for info and lyrics.
//    */
//   private _parseKaraokeBlock(): void {
//     const base64Data = this._findKLyrData();
//     if (!base64Data) {
//       console.warn("KLyrHdr1 block not found.");
//       return;
//     }

//     try {
//       const compressedData = MidiDecode._base64ToUint8Array(base64Data);
//       const decompressedData = pako.inflate(compressedData);

//       // Try decoding with TIS-620 (common for Thai karaoke), fallback to UTF-8
//       let xmlText: string;
//       try {
//         xmlText = MidiDecode._uint8ArrayToString(decompressedData, "tis-620");
//       } catch (e) {
//         xmlText = MidiDecode._uint8ArrayToString(decompressedData, "utf-8");
//       }

//       const parser = new DOMParser();
//       const xmlDoc = parser.parseFromString(xmlText, "text/xml");

//       this._extractInfoFromXml(xmlDoc);
//       this._extractLyricsFromXml(xmlDoc);
//     } catch (error) {
//       console.error("Failed to parse Karaoke XML data:", error);
//     }
//   }

//   /**
//    * Scans all MIDI tracks for text/marker events that represent chords.
//    */
//   private _parseChords(): void {
//     const data = this.midiData;
//     for (let i = 0; i < data.length - 8; i++) {
//       // Check for "MTrk" header
//       if (
//         data
//           .slice(i, i + 4)
//           .every((val, j) => val === MidiDecode.MTRK_HEADER[j])
//       ) {
//         const trackLength =
//           (data[i + 4] << 24) |
//           (data[i + 5] << 16) |
//           (data[i + 6] << 8) |
//           data[i + 7];
//         const trackStartIndex = i + 8;

//         this._parseTrackForChords(
//           data.slice(trackStartIndex, trackStartIndex + trackLength)
//         );

//         i = trackStartIndex + trackLength - 1; // Move to the start of the next potential chunk
//       }
//     }
//   }

//   private _parseTrackForChords(trackData: Uint8Array): void {
//     let currentTick = 0;
//     let pos = 0;
//     while (pos < trackData.length) {
//       try {
//         const deltaResult = MidiDecode._readVlq(trackData, pos);
//         currentTick += deltaResult.value;
//         pos = deltaResult.nextPos;

//         if (pos >= trackData.length) break;

//         const eventByte = trackData[pos];

//         // Meta Event (0xFF)
//         if (eventByte === 0xff && pos + 2 < trackData.length) {
//           const metaType = trackData[pos + 1];
//           const lengthResult = MidiDecode._readVlq(trackData, pos + 2);
//           const metaLength = lengthResult.value;
//           const metaStartPos = lengthResult.nextPos;

//           if (
//             (metaType === 0x01 || metaType === 0x06) &&
//             metaStartPos + metaLength <= trackData.length
//           ) {
//             const textBytes = trackData.slice(
//               metaStartPos,
//               metaStartPos + metaLength
//             );
//             const text = new TextDecoder("latin1").decode(textBytes).trim();
//             if (MidiDecode._isChord(text)) {
//               this.result.chords.push({ chord: text, tick: currentTick });
//             }
//           }
//           pos = metaStartPos + metaLength;
//         }
//         // Skip other events
//         else if (eventByte === 0xf0 || eventByte === 0xf7) {
//           // SysEx
//           pos++;
//           const lengthResult = MidiDecode._readVlq(trackData, pos);
//           pos = lengthResult.nextPos + lengthResult.value;
//         } else if (eventByte >= 0x80) {
//           // MIDI Channel Event
//           pos += trackData[pos] >> 4 < 12 ? 3 : 2; // Most events are 2 or 3 bytes long
//         } else {
//           pos++; // Skip running status or invalid data
//         }
//       } catch (e) {
//         pos++; // Advance past problematic byte
//       }
//     }
//   }

//   // --- XML and Data Extraction Helpers ---

//   private _extractInfoFromXml(xmlDoc: Document): void {
//     const infoElem = xmlDoc.querySelector("INFO");
//     if (infoElem) {
//       MidiDecode.INFO_FIELDS.forEach((field) => {
//         const el = infoElem.querySelector(field);
//         if (el?.textContent) {
//           this.result.info[field] = el.textContent.trim();
//         }
//       });
//     }
//   }

//   private _extractLyricsFromXml(xmlDoc: Document): void {
//     const lines = xmlDoc.querySelectorAll("LINE");
//     let currentLine: LyricEvent[] = [];

//     lines.forEach((line) => {
//       const words = line.querySelectorAll("WORD");
//       currentLine = []; // Start a new line

//       words.forEach((word) => {
//         const textElem = word.querySelector("TEXT");
//         const timeElem = word.querySelector("TIME");
//         if (textElem?.textContent?.trim() && timeElem?.textContent) {
//           currentLine.push({
//             text: textElem.textContent.trim(),
//             tick: parseInt(timeElem.textContent, 10),
//           });
//         }
//       });

//       // Only push the line if it contains lyrics
//       if (currentLine.length > 0) {
//         // @ts-ignore - We'll modify the interface to support line grouping
//         this.result.lyrics.push(currentLine);
//       }
//     });
//   }

//   private _findKLyrData(): string | null {
//     const data = this.midiData;
//     const pattern = MidiDecode.KLYR_HEADER;
//     for (let i = 0; i <= data.length - pattern.length; i++) {
//       if (
//         data.slice(i, i + pattern.length).every((val, j) => val === pattern[j])
//       ) {
//         const startIndex = i + pattern.length;
//         let endIndex = startIndex;
//         while (endIndex < data.length && data[endIndex] !== 0) {
//           endIndex++;
//         }
//         return MidiDecode._uint8ArrayToString(
//           data.slice(startIndex, endIndex),
//           "latin1"
//         );
//       }
//     }
//     return null;
//   }

//   // --- Static Utility Methods ---

//   private static _isChord(text: string): boolean {
//     if (!text || text.length === 0 || text.length > 10) return false;
//     const chordPattern =
//       /^[A-G](?:#|b)?(?:m|min|maj|dim|aug|sus|add|M)?\d?(?:\/\s?[A-G](?:#|b)?)?$/i;
//     return chordPattern.test(text.replace(/\s+/g, ""));
//   }

//   private static _readVlq(data: Uint8Array, pos: number): VlqResult {
//     let value = 0;
//     let byte;
//     let nextPos = pos;
//     do {
//       if (nextPos >= data.length) throw new Error("Incomplete VLQ data");
//       byte = data[nextPos++];
//       value = (value << 7) | (byte & 0x7f);
//     } while ((byte & 0x80) !== 0);
//     return { value, nextPos };
//   }

//   private static _base64ToUint8Array(base64: string): Uint8Array {
//     const binaryString = atob(base64);
//     const bytes = new Uint8Array(binaryString.length);
//     for (let i = 0; i < binaryString.length; i++) {
//       bytes[i] = binaryString.charCodeAt(i);
//     }
//     return bytes;
//   }

//   private static _uint8ArrayToString(
//     buffer: Uint8Array,
//     encoding: string = "utf-8"
//   ): string {
//     return new TextDecoder(encoding).decode(buffer);
//   }
// }
