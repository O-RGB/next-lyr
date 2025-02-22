import { create } from "zustand";

interface LyricsStore {
  lyrics: string[];
  setLyrics: (lyrics: string[]) => void;
  lyricsCuted: string[][];
  setLyricsCuted: (lyrics: string[][]) => void;
  // Cuting Lyrics
  lineIndex: number;
  setLineIndex: (lineIndex: number) => void;
  wordIndex: number;
  setWordIndex: (wordIndex: number) => void;
}

const useLyricsStore = create<LyricsStore>((set) => ({
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
  lineIndex: 0,
  setLineIndex: (lineIndex: number) => {
    set({ lineIndex });
  },
  wordIndex: -1,
  setWordIndex: (wordIndex: number) => {
    set({ wordIndex });
  },
}));

export default useLyricsStore;
