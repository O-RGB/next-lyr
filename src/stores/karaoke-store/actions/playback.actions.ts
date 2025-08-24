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
        if (
          state.lyricsData[state.currentIndex]?.start !== null &&
          state.editingLineIndex === null
        ) {
          return {};
        }
        return {
          isTimingActive: true,
          correctionIndex: null,
          lyricsData: state.lyricsData.map((word, i) =>
            i === state.currentIndex ? { ...word, start: currentTime } : word
          ),
        };
      });
      get().actions.saveCurrentProject();
    },

    recordTiming: (currentTime: number) => {
      let isLineEnd = false;
      set((state) => {
        const newData = [...state.lyricsData];
        const currentWord = newData[state.currentIndex];

        if (currentWord) {
          currentWord.end = currentTime;
          currentWord.length =
            currentWord.end - (currentWord.start ?? currentTime);
        }

        const nextWord = newData[state.currentIndex + 1];
        if (nextWord) {
          nextWord.start = currentTime;
          if (
            currentWord &&
            nextWord.lineIndex !== currentWord.lineIndex &&
            state.editingLineIndex !== null
          ) {
            isLineEnd = true;
          }
        }

        return { lyricsData: newData };
      });

      if (isLineEnd && get().editingLineIndex !== null) {
        get().actions.stopTiming();
      }

      get().actions.saveCurrentProject();
      return { isLineEnd };
    },

    goToNextWord: () => {
      set((state) => {
        if (state.currentIndex + 1 < state.lyricsData.length) {
          const nextIndex = state.currentIndex + 1;
          const nextWord = state.lyricsData[nextIndex];
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
        const wordToCorrect = state.lyricsData[newCurrentIndex];
        if (!wordToCorrect) return {};

        lineStartTime = getPreRollTime(
          wordToCorrect.lineIndex,
          state.lyricsData
        );

        const newData = [...state.lyricsData];
        if (newData[state.currentIndex]) {
          newData[state.currentIndex].start = null;
        }
        if (newData[newCurrentIndex]) {
          newData[newCurrentIndex].end = null;
          newData[newCurrentIndex].length = 0;
        }

        return {
          lyricsData: newData,
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
