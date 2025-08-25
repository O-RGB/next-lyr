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

        // If timing hasn't started, and not in a specific edit mode, start from the beginning.
        if (state.currentIndex === -1 && state.editingLineIndex === null) {
          newCurrentIndex = 0;
          newSelectedLineIndex = 0;
        }

        const newData = [...state.lyricsData];
        const wordToStart = newData[newCurrentIndex];

        if (wordToStart) {
          // Only set start time if it's null (first press) or if we are in a line-specific edit mode
          if (wordToStart.start === null || state.editingLineIndex !== null) {
            wordToStart.start = currentTime;
          }
        }

        return {
          lyricsData: newData,
          currentIndex: newCurrentIndex,
          selectedLineIndex: newSelectedLineIndex,
          isTimingActive: true,
          correctionIndex: null,
        };
      });
      get().actions.saveCurrentProject();
    },

    startTimingFromLine: (lineIndex: number) => {
      const { lyricsData } = get();
      const firstWordOfLine = lyricsData.find((w) => w.lineIndex === lineIndex);

      if (!firstWordOfLine) {
        return { success: false, preRollTime: 0 };
      }

      const firstWordIndex = firstWordOfLine.index;
      const preRollTime = getPreRollTime(lineIndex, lyricsData);

      set((state) => ({
        lyricsData: state.lyricsData.map((word) =>
          word.lineIndex >= lineIndex
            ? { ...word, start: null, end: null, length: 0 }
            : word
        ),
        currentIndex: firstWordIndex,
        selectedLineIndex: lineIndex,
        editingLineIndex: null, // This is key: null for multi-line timing
        isTimingActive: false, // Let the first arrow press trigger this
        correctionIndex: null,
        lyricsProcessed: undefined,
      }));

      get().actions.saveCurrentProject();
      return { success: true, preRollTime };
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
          const isCrossingLines =
            currentWord && nextWord.lineIndex !== currentWord.lineIndex;

          // Only consider it the end of the line for timing purposes if in single-line edit mode
          if (isCrossingLines && state.editingLineIndex !== null) {
            isLineEnd = true;
          } else {
            nextWord.start = currentTime;
          }
        } else {
          // This is the absolute end of all lyrics
          isLineEnd = true;
        }

        return { lyricsData: newData };
      });

      // Stop timing only if it was a single-line edit session that just ended
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
        // If it's the last word, stop the timing session
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
        // Clear timing for the word that was wrong and the one being corrected
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
          isTimingActive: true, // Re-activate timing immediately for correction
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
