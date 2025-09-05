import { ParsedSongData } from "../shared/types";

export interface MIDIOptionValue<T> {
  label: string;
  value: T;
}

export interface LyricEvent {
  text: string;
  tick: number;
  vocal?: string;
}
export interface ChordEvent {
  chord: string;
  tick: number;
}

export type VOCAL_CHANNEL = "NONE" | "9" | "1" | "RIGHT";
export const vocalChannelOption: MIDIOptionValue<VOCAL_CHANNEL>[] = [
  {
    label: "NONE",
    value: "NONE",
  },
  {
    label: "9",
    value: "9",
  },
  {
    label: "1",
    value: "1",
  },
  {
    label: "RIGHT",
    value: "RIGHT",
  },
];

export type ARTIST_TYPE = "M" | "F" | "MF";
export const artistTypeOption: MIDIOptionValue<ARTIST_TYPE>[] = [
  {
    label: "M",
    value: "M",
  },
  {
    label: "F",
    value: "F",
  },
  {
    label: "MF",
    value: "MF",
  },
];

export type LANGUAGE = "DEFAULT" | "THAI" | "CHINESEBIG5";
export const languageOption: MIDIOptionValue<LANGUAGE>[] = [
  {
    label: "DEFAULT",
    value: "DEFAULT",
  },
  {
    label: "THAI",
    value: "THAI",
  },
  {
    label: "CHINESEBIG5",
    value: "CHINESEBIG5",
  },
];

export type KEY =
  | "C"
  | "Cm"
  | "C#"
  | "C#m"
  | "D"
  | "Dm"
  | "Eb"
  | "Ebm"
  | "E"
  | "Em"
  | "F"
  | "Fm"
  | "F#"
  | "F#m"
  | "G"
  | "Gm"
  | "Ab"
  | "Abm"
  | "A"
  | "Am"
  | "Bb"
  | "Bbm"
  | "B"
  | "Bm";
export const keyOption: MIDIOptionValue<KEY>[] = [
  {
    label: "Cm",
    value: "Cm",
  },
  {
    label: "C#",
    value: "C#",
  },
  {
    label: "C#m",
    value: "C#m",
  },
  {
    label: "D",
    value: "D",
  },
  {
    label: "Dm",
    value: "Dm",
  },
  {
    label: "Eb",
    value: "Eb",
  },
  {
    label: "Ebm",
    value: "Ebm",
  },
  {
    label: "E",
    value: "E",
  },
  {
    label: "Em",
    value: "Em",
  },
  {
    label: "F",
    value: "F",
  },
  {
    label: "Fm",
    value: "Fm",
  },
  {
    label: "F#",
    value: "F#",
  },
  {
    label: "F#m",
    value: "F#m",
  },
  {
    label: "G",
    value: "G",
  },
  {
    label: "Gm",
    value: "Gm",
  },
  {
    label: "Ab",
    value: "Ab",
  },
  {
    label: "Abm",
    value: "Abm",
  },
  {
    label: "A",
    value: "A",
  },
  {
    label: "Am",
    value: "Am",
  },
  {
    label: "Bb",
    value: "Bb",
  },
  {
    label: "Bbm",
    value: "Bbm",
  },
  {
    label: "B",
    value: "B",
  },
  {
    label: "Bm",
    value: "Bm",
  },
];

export interface SongInfo {
  VERSION: string;
  SOURCE: string;
  CHARSET?: string;
  TIME_FORMAT: string;
  TITLE: string;
  KEY?: KEY;
  TEMPO?: string;
  ALBUM?: string;
  ARTIST: string;
  ARTIST_TYPE?: ARTIST_TYPE;
  AUTHOR?: string;
  GENRE?: string;
  RHYTHM?: string;
  CREATOR?: string;
  COMPANY?: string;
  LANGUAGE: LANGUAGE;
  YEAR?: string;
  VOCAL_CHANNEL: VOCAL_CHANNEL;
  LYRIC_TITLE?: string;
}

export const DEFAULT_SONG_INFO: SongInfo = {
  VERSION: "1.1",
  SOURCE: "LYRIC_EDITOR",
  CHARSET: "TIS-620",
  TIME_FORMAT: "",
  TITLE: "",
  KEY: "C",
  TEMPO: "",
  ALBUM: "",
  ARTIST: "",
  ARTIST_TYPE: "M",
  AUTHOR: "",
  GENRE: "",
  RHYTHM: "",
  CREATOR: "",
  COMPANY: "",
  LANGUAGE: "THAI",
  YEAR: "",
  VOCAL_CHANNEL: "9",
  LYRIC_TITLE: "",
};

export interface IMidiParseResult extends ParsedSongData {
  midiData: MidiFile;
  detectedHeader: string;
  firstNoteOnTick: number | null;
}

export interface BuildOptions {
  originalMidiData: MidiFile;
  newSongInfo: SongInfo;
  newLyricsData: LyricEvent[][];
  newChordsData: ChordEvent[];
  headerToUse: string;
}

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
