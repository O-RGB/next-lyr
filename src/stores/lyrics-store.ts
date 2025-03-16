import { ILyricsBuilder } from "@/lib/karaoke/builder/lyr-builder";
import { create } from "zustand";

interface LyricsStore {
  lyrics: string[];
  setLyrics: (lyrics: string[]) => void;
  lyricsCuted: string[][];
  setLyricsCuted: (lyrics: string[][]) => void;
  songDetail?: ILyricsBuilder;
  setSongDetail: (songDetail: ILyricsBuilder) => void;
  // Cuting Lyrics
  lineIndex: number;
  setLineIndex: (lineIndex: number) => void;
  wordIndex: number;
  setWordIndex: (wordIndex: number) => void;
  // cursor: number[][];
  cursors: Map<number, number[]>;
  getCursor: () => number[][];
  getCursorByLine: (line: number, word: number) => number[] | number;
  cursorsPreview?: number[];
  setCursorPreveiw: (cursor: number[]) => void;
}

const useLyricsStore = create<LyricsStore>((set, get) => ({
  lyrics: [],
  setLyrics: (lyrics: string[]) =>
    set((state) => ({
      lyrics,
    })),
  lyricsCuted: [],
  setLyricsCuted: (lyricsCuted: string[][]) =>
    set((state) => ({
      lyricsCuted,
    })),
  songDetail: undefined,
  setSongDetail: (songDetail) => {
    set({ songDetail });
  },
  lineIndex: 0,
  setLineIndex: (lineIndex: number) => {
    set({ lineIndex });
  },
  wordIndex: -1,
  setWordIndex: (wordIndex: number) => {
    set({ wordIndex });
  },
  getCursorByLine: (line, word) => {
    const list = get().cursors.get(line) ?? [];
    const index = list[word] ?? -1;
    return index;
  },
  getCursor: () => {
    return Array.from(get().cursors.entries()).map(([key, values]) => {
      return [key == 0 ? 0 : values[0], ...values];
    });
  },
  cursors: new Map(),
  setCursorPreveiw: (cursorsPreview) => set({ cursorsPreview }),
  cursorsPreview: [],
}));

export default useLyricsStore;
