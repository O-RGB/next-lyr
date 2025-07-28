export interface IOptions {
  value?: string | number | string[] | number[];
  label?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  options?: IOptions[];
}

export interface LyricWordData {
  name: string;
  start: number | null;
  end: number | null;
  length: number;
  index: number;
  lineIndex: number;
}

export interface ExportData {
  title: string;
  artist: string;
  lyrics: Omit<LyricWordData, "index" | "lineIndex">[];
}

export interface IMidiInfo {
  fileName: string;
  durationTicks: number;
  ppq: number;
  bpm: number;
}

export type MusicMode = "mp3" | "midi" | "mp4" | "youtube";


export interface ISongInfo{

}