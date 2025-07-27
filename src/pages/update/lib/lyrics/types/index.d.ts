export type LyricsPosition = "top" | "bottom";
export type LyricsKeyProps = [number, number];

export interface LyricsRangeValueProps<T> {
  value: T;
  tag: LyricsPosition;
}

export interface LyricsRangeProps<T> {
  key: LyricsKeyProps;
  value: LyricsRangeValueProps<T>;
}

export interface ISentence {
  text: string;
  start: number;
  valueName: number[];
}

export interface ILyricsBuilder {
  name: string;
  artist: string;
  key: string;
  lyrics: string[];
}
