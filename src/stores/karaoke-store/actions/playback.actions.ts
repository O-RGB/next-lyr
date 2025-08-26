import { StateCreator } from "zustand";
import { getPreRollTime } from "../utils";
import { KaraokeState, PlaybackActions } from "../types";

export const createPlaybackActions: StateCreator<
  KaraokeState,
  [],
  [],
  { actions: PlaybackActions }
> = (set, get) => ({
  actions: {
    setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
    setCurrentTime: (time: number) => set({ currentTime: time }),
    setPlaybackIndex: (index: number | null) => set({ playbackIndex: index }),
    setCurrentIndex: (index: number) => set({ currentIndex: index }),
    setCorrectionIndex: (index: number | null) =>
      set({ correctionIndex: index }),

    startTiming: (currentTime: number) => {
      set((state) => {
        let newCurrentIndex = state.currentIndex;
        let newSelectedLineIndex = state.selectedLineIndex;
        const flatLyrics = state.lyricsData.flat();

        if (state.currentIndex === -1 && state.editingLineIndex === null) {
          newCurrentIndex = 0;
          newSelectedLineIndex = 0;
        }

        const wordToStart = flatLyrics[newCurrentIndex];
        const newLyricsData = [...state.lyricsData];

        if (wordToStart) {
          if (wordToStart.start === null || state.editingLineIndex !== null) {
            newLyricsData[wordToStart.lineIndex] = newLyricsData[
              wordToStart.lineIndex
            ].map((w) =>
              w.index === newCurrentIndex ? { ...w, start: currentTime } : w
            );
          }
        }

        return {
          lyricsData: newLyricsData,
          currentIndex: newCurrentIndex,
          selectedLineIndex: newSelectedLineIndex,
          isTimingActive: true,
          correctionIndex: null,
        };
      });
      get().actions.saveCurrentProject();
    },

    startTimingFromLine: (lineIndex: number) => {
      const flatLyrics = get().lyricsData.flat();
      const firstWordOfLine = flatLyrics.find((w) => w.lineIndex === lineIndex);

      if (!firstWordOfLine) {
        return { success: false, preRollTime: 0 };
      }

      const firstWordIndex = firstWordOfLine.index;
      const preRollTime = getPreRollTime(lineIndex, flatLyrics);

      set((state) => ({
        lyricsData: state.lyricsData.map((line, idx) =>
          idx >= lineIndex
            ? line.map((word) => ({
                ...word,
                start: null,
                end: null,
                length: 0,
              }))
            : line
        ),
        currentIndex: firstWordIndex,
        selectedLineIndex: lineIndex,
        editingLineIndex: null,
        isTimingActive: false,
        correctionIndex: null,
        lyricsProcessed: undefined,
      }));

      get().actions.saveCurrentProject();
      return { success: true, preRollTime };
    },

    recordTiming: (currentTime: number) => {
      let isLineEnd = false;
      set((state) => {
        const flatLyrics = state.lyricsData.flat();
        const newLyricsData = [...state.lyricsData];
        const currentWord = flatLyrics[state.currentIndex];

        if (currentWord) {
          newLyricsData[currentWord.lineIndex] = newLyricsData[
            currentWord.lineIndex
          ].map((w) =>
            w.index === state.currentIndex
              ? {
                  ...w,
                  end: currentTime,
                  length: currentTime - (w.start ?? currentTime),
                }
              : w
          );
        }

        const nextWord = flatLyrics[state.currentIndex + 1];
        if (nextWord) {
          const isCrossingLines =
            currentWord && nextWord.lineIndex !== currentWord.lineIndex;

          if (isCrossingLines && state.editingLineIndex !== null) {
            isLineEnd = true;
          } else {
            newLyricsData[nextWord.lineIndex] = newLyricsData[
              nextWord.lineIndex
            ].map((w) =>
              w.index === state.currentIndex + 1
                ? { ...w, start: currentTime }
                : w
            );
          }
        } else {
          isLineEnd = true;
        }

        return { lyricsData: newLyricsData };
      });

      if (isLineEnd && get().editingLineIndex !== null) {
        get().actions.stopTiming();
      }

      get().actions.saveCurrentProject();
      return { isLineEnd };
    },

    goToNextWord: () => {
      set((state) => {
        const flatLyrics = state.lyricsData.flat();
        if (state.currentIndex + 1 < flatLyrics.length) {
          const nextIndex = state.currentIndex + 1;
          const nextWord = flatLyrics[nextIndex];
          return {
            currentIndex: nextIndex,
            selectedLineIndex: nextWord
              ? nextWord.lineIndex
              : state.selectedLineIndex,
            correctionIndex: null,
          };
        }

        return { isTimingActive: false, editingLineIndex: null };
      });
    },

    correctTimingStep: (newCurrentIndex: number) => {
      let lineStartTime = 0;
      set((state) => {
        const flatLyrics = state.lyricsData.flat();
        const wordToCorrect = flatLyrics[newCurrentIndex];
        if (!wordToCorrect) return {};

        lineStartTime = getPreRollTime(wordToCorrect.lineIndex, flatLyrics);

        const newLyricsData = [...state.lyricsData];

        const currentWord = flatLyrics[state.currentIndex];
        if (currentWord) {
          newLyricsData[currentWord.lineIndex] = newLyricsData[
            currentWord.lineIndex
          ].map((w) =>
            w.index === state.currentIndex ? { ...w, start: null } : w
          );
        }
        if (wordToCorrect) {
          newLyricsData[wordToCorrect.lineIndex] = newLyricsData[
            wordToCorrect.lineIndex
          ].map((w) =>
            w.index === newCurrentIndex ? { ...w, end: null, length: 0 } : w
          );
        }

        return {
          lyricsData: newLyricsData,
          currentIndex: newCurrentIndex,
          correctionIndex: newCurrentIndex,
          isTimingActive: true,
        };
      });

      get().actions.saveCurrentProject();
      return { lineStartTime };
    },

    stopTiming: async () => {
      set({ isTimingActive: false, editingLineIndex: null });
      get().actions.processLyricsForPlayer();
      await get().actions.saveCurrentProject();
    },
  },
});
