/**
 * MIDI KLyr Parser TypeScript Definitions
 * @version 1.0.0
 */

export interface LyricEvent {
  text: string;
  tick: number;
  vocal?: string;
}

export interface ChordEvent {
  chord: string;
  tick: number;
}

export type SongInfo = Record<string, string>;

export interface MidiEvent {
  type: "meta" | "channel" | "sysex" | "unknown";
  absoluteTime: number;
  nextOffset?: number;
  metaType?: number;
  data?: Uint8Array;
  text?: string;
  status?: number;
}

export interface MidiFile {
  format: number;
  trackCount: number;
  ticksPerBeat: number;
  tracks: MidiEvent[][];
}

export interface ParseResult {
  midiData: MidiFile;
  info: SongInfo;
  lyrics: LyricEvent[][];
  chords: ChordEvent[];
  detectedHeader: string;
}

export interface KLyrData {
  info: SongInfo;
  lyrics: LyricEvent[][];
}

export interface ModifiedMidiResult {
  format: number;
  ticksPerBeat: number;
  tracks: MidiEvent[][];
}

export declare class MidiKLyrParser {
  midiData: MidiFile | null;
  rawMidiBuffer: ArrayBuffer | null;
  songInfo: SongInfo;
  lyricsData: LyricEvent[][];
  chordsData: ChordEvent[];
  detectedHeader: string;

  constructor();

  /**
   * Convert string to TIS-620 encoded bytes
   */
  stringToTIS620(str: string): Uint8Array;

  /**
   * Convert TIS-620 encoded bytes to string
   */
  TIS620ToString(bytes: Uint8Array): string;

  /**
   * Convert base64 string to ArrayBuffer
   */
  base64ToArrayBuffer(base64: string): ArrayBuffer;

  /**
   * Convert ArrayBuffer to base64 string
   */
  arrayBufferToBase64(buffer: ArrayBuffer): string;

  /**
   * Parse MIDI file from ArrayBuffer
   */
  parseMidiFile(buffer: ArrayBuffer): MidiFile;

  /**
   * Read variable length value from MIDI data
   */
  readVariableLength(
    view: DataView,
    offset: number
  ): { value: number; nextOffset: number };

  /**
   * Parse MIDI event
   */
  parseEvent(view: DataView, offset: number, runningStatus: number): MidiEvent;

  /**
   * Parse MIDI file and extract all data
   */
  parseFile(buffer: ArrayBuffer): ParseResult;

  /**
   * Extract lyrics, chords and song info from MIDI data
   */
  extractAllData(): void;

  /**
   * Parse KLyr data from encoded payload
   */
  parseKLyrDataFromEncodedPayload(encodedPayload: string): KLyrData | null;

  /**
   * Parse KLyr XML document
   */
  parseKLyrXML(xmlDoc: Document): KLyrData;

  /**
   * Build modified MIDI with new data
   */
  buildModifiedMidi(
    infoData: SongInfo,
    lyricsData: LyricEvent[][],
    chordsData: ChordEvent[],
    headerToUse: string
  ): ModifiedMidiResult;

  /**
   * Build KLyr XML from data
   */
  buildKLyrXML(infoData: SongInfo, lyricsData: LyricEvent[][]): string;

  /**
   * Escape XML characters
   */
  escapeXml(text: string): string;

  /**
   * Encode KLyr payload
   */
  encodeKLyrPayload(xml: string): string;

  /**
   * Build complete MIDI file
   */
  buildMidiFile(
    tracks: MidiEvent[][],
    format: number,
    ticksPerBeat: number
  ): ArrayBuffer;

  /**
   * Build track data
   */
  buildTrackData(track: MidiEvent[]): Uint8Array;

  /**
   * Write variable length value
   */
  writeVariableLength(value: number): number[];

  /**
   * Save MIDI with modified data
   */
  saveMidi(
    infoData: SongInfo,
    lyricsData: LyricEvent[][],
    chordsData: ChordEvent[]
  ): ArrayBuffer;
}

/**
 * Parse MIDI file from ArrayBuffer (convenience function)
 */
export declare function parseMidiFile(buffer: ArrayBuffer): ParseResult;

/**
 * Save MIDI file with modified data (convenience function)
 */
export declare function saveMidiFile(
  parser: MidiKLyrParser,
  infoData: SongInfo,
  lyricsData: LyricEvent[][],
  chordsData: ChordEvent[]
): ArrayBuffer;

export default MidiKLyrParser;
