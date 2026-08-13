import type { LyricsWord } from "@/lib/karaoke/lyrics-core/types";

export interface IOptions {
  value?: string | number | string[] | number[];
  label?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  options?: IOptions[];
}

export type LyricWordData = LyricsWord & {
  index: number;
  lineIndex: number;
};

export interface ExportData {
  title: string;
  artist: string;
  lyrics: Omit<LyricWordData, "index" | "lineIndex">[];
}

export interface IMidiInfo<T = any> {
  fileName: string;
  durationTicks: number;
  ppq: number;
  bpm: number;
  raw: T;
}

export type MusicMode = "mp3" | "midi" | "mp4" | "youtube";

export interface ISongInfo {}
