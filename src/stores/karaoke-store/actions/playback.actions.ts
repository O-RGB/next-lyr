import { StateCreator } from "zustand";
import { getPreRollTime } from "../utils";
import { KaraokeState, PlaybackActions } from "../types";
import { usePlayerSetupStore } from "@/hooks/usePlayerSetup";

export const createPlaybackActions: StateCreator<
  KaraokeState,
  [],
  [],
  { actions: PlaybackActions }
> = (set, get) => ({
  actions: {
    setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
    setCurrentTempo(tempo) {
      set({ currentTempo: tempo });
    },
    setCurrentTime: (time: number) => {
      const { playerState, isPlaying, mode } = get();
      const { duration } = playerState;
      if (
        mode === "midi" &&
        isPlaying &&
        duration !== null &&
        time >= duration
      ) {
        const { playerControls } = usePlayerSetupStore.getState();
        if (playerControls) {
          playerControls.pause();
        }

        set({ currentTime: duration });
      } else {
        set({ currentTime: time });
      }
    },
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

        const timingBuffer = state.timingBuffer || {
          lineIndex: wordToStart.lineIndex,
          buffer: new Map(),
        };

        if (wordToStart.start === null || state.editingLineIndex !== null) {
          timingBuffer.buffer.set(wordToStart.index, {
            start: currentTime,
            end: null,
          });
        }

        return {
          currentIndex: newCurrentIndex,
          selectedLineIndex: newSelectedLineIndex,
          isTimingActive: true,
          correctionIndex: null,
          timingBuffer,
          timingDirection: "forward",
        };
      });
    },

    startTimingFromLine: (lineIndex: number, endLineIndex?: number) => {
      const flatLyrics = get().lyricsData.flat();
      const firstWordOfLine = flatLyrics.find((w) => w.lineIndex === lineIndex);

      if (!firstWordOfLine) {
        return { success: false, preRollTime: 0 };
      }

      const finalEndLineIndex = endLineIndex ?? get().lyricsData.length - 1;
      const firstWordIndex = firstWordOfLine.index;
      const preRollTime = getPreRollTime(lineIndex, flatLyrics);

      set((state) => ({
        lyricsData: state.lyricsData.map((line, idx) =>
          idx >= lineIndex && idx <= finalEndLineIndex
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
        editingLineIndex: lineIndex,
        editingEndLineIndex: finalEndLineIndex,
        isTimingActive: false,
        correctionIndex: null,
        lyricsProcessed: undefined,
        timingBuffer: null,
      }));

      return { success: true, preRollTime };
    },

    recordTiming: (currentTime: number) => {
      const state = get();
      const { timingBuffer, lyricsData, currentIndex, editingEndLineIndex } =
        state;

      if (!timingBuffer) {
        return { isLineEnd: false };
      }

      const flatLyrics = lyricsData.flat();
      const newBuffer = new Map(timingBuffer.buffer);
      let isLineEnd = false;

      const currentWord = flatLyrics[currentIndex];
      if (currentWord) {
        const currentWordData = newBuffer.get(currentWord.index) || {
          start: currentWord.start,
          end: null,
        };
        currentWordData.end = currentTime;
        newBuffer.set(currentWord.index, currentWordData);
      }

      const nextWord = flatLyrics[currentIndex + 1];

      if (
        !nextWord ||
        (editingEndLineIndex !== null &&
          nextWord.lineIndex > editingEndLineIndex)
      ) {
        isLineEnd = true;
      }

      if (!isLineEnd && nextWord) {
        const nextWordData = newBuffer.get(nextWord.index) || {
          start: null,
          end: null,
        };
        nextWordData.start = currentTime;
        newBuffer.set(nextWord.index, nextWordData);
      }

      set({
        timingBuffer: {
          ...timingBuffer,
          buffer: newBuffer,
        },
      });

      // ลบส่วนที่เรียก stopTiming() ออกจากตรงนี้
      // if (isLineEnd) {
      //   get().actions.stopTiming();
      // }

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
            timingDirection: "forward",
          };
        }

        return { isTimingActive: false, editingLineIndex: null };
      });
    },

    correctTimingStep: (newCurrentIndex: number) => {
      let lineStartTime = 0;
      const state = get();
      if (!state.timingBuffer) return { lineStartTime: 0 };

      const flatLyrics = state.lyricsData.flat();
      const wordToCorrect = flatLyrics[newCurrentIndex];
      if (!wordToCorrect) return { lineStartTime: 0 };

      const targetLineIndex = wordToCorrect.lineIndex;

      if (targetLineIndex > 0) {
        const preRollLineIndex = targetLineIndex - 1;
        const firstWordOfPreRollLine = flatLyrics.find(
          (w) => w.lineIndex === preRollLineIndex
        );

        if (firstWordOfPreRollLine) {
          const preRollTimeFromBuffer = state.timingBuffer.buffer.get(
            firstWordOfPreRollLine.index
          )?.start;

          if (
            preRollTimeFromBuffer !== null &&
            preRollTimeFromBuffer !== undefined
          ) {
            lineStartTime = preRollTimeFromBuffer;
          } else {
            lineStartTime = getPreRollTime(targetLineIndex, flatLyrics);
          }
        } else {
          lineStartTime = getPreRollTime(targetLineIndex, flatLyrics);
        }
      } else {
        lineStartTime = 0;
      }

      set(() => {
        const newBuffer = new Map(state.timingBuffer!.buffer);

        const wordAfter = flatLyrics[newCurrentIndex + 1];
        if (wordAfter) {
          const data = newBuffer.get(wordAfter.index);
          if (data) {
            data.start = null;
            newBuffer.set(wordAfter.index, data);
          }
        }

        const dataToCorrect = newBuffer.get(wordToCorrect.index);
        if (dataToCorrect) {
          dataToCorrect.end = null;
          newBuffer.set(wordToCorrect.index, dataToCorrect);
        }

        return {
          currentIndex: newCurrentIndex,
          correctionIndex: newCurrentIndex,
          selectedLineIndex: wordToCorrect.lineIndex,
          isTimingActive: true,
          timingBuffer: { ...state.timingBuffer!, buffer: newBuffer },
          timingDirection: "backward",
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
            editingEndLineIndex: null,
            timingBuffer: null,
            timingDirection: null,
          };
        }

        const { buffer } = timingBufferData;

        const newLyricsData = prevState.lyricsData.map((line) =>
          line.map((word) => {
            if (buffer.has(word.index)) {
              const bufferedData = buffer.get(word.index)!;
              const start = bufferedData.start ?? word.start;
              const end = bufferedData.end ?? word.end;
              const length =
                end !== null && start !== null ? Math.max(0, end - start) : 0;
              return { ...word, start, end, length };
            }
            return word;
          })
        );

        return {
          lyricsData: newLyricsData,
          isTimingActive: false,
          editingLineIndex: null,
          editingEndLineIndex: null,
          timingBuffer: null,
          timingDirection: null,
        };
      });

      get().actions.processLyricsForPlayer();
      await get().actions.saveCurrentProject();
    },
  },
});
