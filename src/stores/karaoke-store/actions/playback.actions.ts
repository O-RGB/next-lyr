import { StateCreator } from "zustand";
import { getPreRollTime } from "../utils";
import { KaraokeState, PlaybackActions, TimingBufferData } from "../types";

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
        if (!wordToStart) return {};

        const newTimingBuffer: TimingBufferData = {
          lineIndex: wordToStart.lineIndex, // 🔽 กำหนด lineIndex ที่กำลังแก้ไข
          buffer: new Map(),
        };

        if (wordToStart.start === null || state.editingLineIndex !== null) {
          newTimingBuffer.buffer.set(wordToStart.index, {
            start: currentTime,
            end: null,
          });
        }

        return {
          currentIndex: newCurrentIndex,
          selectedLineIndex: newSelectedLineIndex,
          isTimingActive: true,
          correctionIndex: null,
          timingBuffer: newTimingBuffer, // 🔽 อัปเดต timingBuffer ด้วยโครงสร้างใหม่
        };
      });
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
        timingBuffer: null, // เริ่มต้นด้วย null
      }));

      return { success: true, preRollTime };
    },

    recordTiming: (currentTime: number) => {
      let isLineEnd = false;
      set((state) => {
        if (!state.timingBuffer) return {};

        const newBuffer = new Map(state.timingBuffer.buffer);
        const flatLyrics = state.lyricsData.flat();

        const currentWord = flatLyrics[state.currentIndex];
        if (currentWord) {
          const currentWordData = newBuffer.get(currentWord.index) || {
            start: currentWord.start,
            end: null,
          };
          currentWordData.end = currentTime;
          newBuffer.set(currentWord.index, currentWordData);
        }

        const nextWord = flatLyrics[state.currentIndex + 1];
        if (nextWord) {
          const isCrossingLines =
            currentWord && nextWord.lineIndex !== currentWord.lineIndex;

          if (isCrossingLines && state.editingLineIndex !== null) {
            isLineEnd = true;
          } else {
            const nextWordData = newBuffer.get(nextWord.index) || {
              start: null,
              end: null,
            };
            nextWordData.start = currentTime;
            newBuffer.set(nextWord.index, nextWordData);
          }
        } else {
          isLineEnd = true;
        }

        return {
          timingBuffer: {
            ...state.timingBuffer,
            buffer: newBuffer,
          },
        };
      });

      if (isLineEnd && get().editingLineIndex !== null) {
        get().actions.stopTiming();
      }

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
        if (!state.timingBuffer) return {};

        const flatLyrics = state.lyricsData.flat();
        const wordToCorrect = flatLyrics[newCurrentIndex];
        if (!wordToCorrect) return {};

        lineStartTime = getPreRollTime(wordToCorrect.lineIndex, flatLyrics);
        const newBuffer = new Map(state.timingBuffer.buffer);

        const currentWord = flatLyrics[state.currentIndex];
        if (currentWord) {
          const data = newBuffer.get(currentWord.index);
          if (data) {
            data.start = null;
            newBuffer.set(currentWord.index, data);
          }
        }
        if (wordToCorrect) {
          const data = newBuffer.get(wordToCorrect.index);
          if (data) {
            data.end = null;
            newBuffer.set(wordToCorrect.index, data);
          }
        }

        return {
          currentIndex: newCurrentIndex,
          correctionIndex: newCurrentIndex,
          isTimingActive: true,
          timingBuffer: { ...state.timingBuffer, buffer: newBuffer },
        };
      });

      return { lineStartTime };
    },

    stopTiming: async () => {
      const state = get();
      const timingBufferData = state.timingBuffer;

      set((prevState) => {
        if (!timingBufferData || timingBufferData.buffer.size === 0) {
          return {
            isTimingActive: false,
            editingLineIndex: null,
            timingBuffer: null,
          };
        }

        const { buffer } = timingBufferData;

        const newLyricsData = prevState.lyricsData.map((line) =>
          line.map((word) => {
            if (buffer.has(word.index)) {
              const bufferedData = buffer.get(word.index)!;
              const start = bufferedData.start ?? word.start;
              const end = bufferedData.end ?? word.end;
              return {
                ...word,
                start: start,
                end: end,
                length: end !== null && start !== null ? end - start : 0,
              };
            }
            return word;
          })
        );

        return {
          lyricsData: newLyricsData,
          isTimingActive: false,
          editingLineIndex: null,
          timingBuffer: null,
        };
      });

      get().actions.processLyricsForPlayer();
      await get().actions.saveCurrentProject();
    },
  },
});
