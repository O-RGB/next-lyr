import type { SongInfo, TempoEvent } from "../midi/types";

export type LyricsSourceKind =
  | "KMID"
  | "NCN"
  | "MP3"
  | "KAR"
  | (string & {});

export type LyricsTimeBase =
  | {
      kind: "midi-tick";
      ppq: number;
      tempoChanges?: TempoEvent[];
    }
  | {
      kind: "seconds";
    };

export interface LyricsWord {
  id?: string;
  text: string;
  at: number | null;
  vocal?: string;
}

export interface LyricsDocument {
  source: LyricsSourceKind;
  timeBase: LyricsTimeBase;
  info: Partial<SongInfo>;
  lines: LyricsWord[][];
}
