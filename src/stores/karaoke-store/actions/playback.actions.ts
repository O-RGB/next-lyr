import { StateCreator } from "zustand";
import { getPreRollTime } from "../utils";
import { KaraokeState, PlaybackActions } from "../types";
import { usePlayerSetupStore } from "@/hooks/usePlayerSetup";
import { LyricWordData } from "@/types/common.type";

function cloneLyricsData(lyricsData: LyricWordData[][]): LyricWordData[][] {
  return lyricsData.map((line) => line.map((word) => ({ ...word })));
}

function groupConsecutiveLineIndices(lineIndices: number[]): number[][] {
  const sorted = [...new Set(lineIndices)]
    .filter((lineIndex) => Number.isInteger(lineIndex) && lineIndex >= 0)
    .sort((left, right) => left - right);
  const groups: number[][] = [];

  for (const lineIndex of sorted) {
    const previous = groups[groups.length - 1];
    if (previous && lineIndex === previous[previous.length - 1] + 1) {
      previous.push(lineIndex);
    } else {
      groups.push([lineIndex]);
    }
  }

  return groups;
}

export const createPlaybackActions: StateCreator<
  KaraokeState,
  [],
  [],
  { actions: PlaybackActions }
> = (set, get) => ({
  actions: {
    setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
    setCurrentTempo(tempo) {
      set((state) => (state.currentTempo === tempo ? {} : { currentTempo: tempo }));
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

        set((state) =>
          state.currentTime === duration ? {} : { currentTime: duration }
        );
      } else {
        set((state) => (state.currentTime === time ? {} : { currentTime: time }));
      }
    },
    setPlaybackIndex: (index: number | null) => set({ playbackIndex: index }),
    setPlaybackVisualOverride: (override) =>
      set({ playbackVisualOverride: override }),
    setCurrentIndex: (index: number) => set({ currentIndex: index }),
    setCorrectionIndex: (index: number | null) =>
      set({ correctionIndex: index }),

    startTiming: (currentTime: number) => {
      set((state) => {
        let newCurrentIndex = state.currentIndex;
        let newSelectedLineIndex = state.selectedLineIndex;
        const flatLyrics = state.lyricsData.flat();

        if (state.currentIndex === -1) {
          if (state.editingLineIndex !== null) {
            newCurrentIndex =
              flatLyrics.find(
                (word) => word.lineIndex === state.editingLineIndex
              )?.index ?? -1;
            newSelectedLineIndex = state.editingLineIndex;
          } else {
            newCurrentIndex = 0;
            newSelectedLineIndex = 0;
          }
        }

        const wordToStart = flatLyrics[newCurrentIndex];
        if (!wordToStart) return {};

        const timingBuffer = state.timingBuffer || {
          lineIndex: wordToStart.lineIndex,
          buffer: new Map(),
        };

        if (wordToStart.at === null || state.editingLineIndex !== null) {
          timingBuffer.buffer.set(wordToStart.index, {
            at: currentTime,
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

    startTimingFromLines: (lineIndices: number[]) => {
      const flatLyrics = get().lyricsData.flat();
      const groups = groupConsecutiveLineIndices(lineIndices).filter((group) =>
        group.some((lineIndex) =>
          flatLyrics.some((word) => word.lineIndex === lineIndex)
        )
      );
      const firstGroup = groups[0];
      const firstWordOfLine = firstGroup
        ? flatLyrics.find((w) => w.lineIndex === firstGroup[0])
        : undefined;

      if (!firstWordOfLine) {
        return { success: false, preRollTime: 0 };
      }

      // Start from box 1 of the preceding line so the user hears the full
      // preparation line before stamping the selected line.
      const preRollTime = getPreRollTime(firstGroup[0], flatLyrics);
      const snapshot = cloneLyricsData(get().lyricsData);
      const selectedLineSet = new Set(groups.flat());

      set((state) => ({
        lyricsData: state.lyricsData.map((line, idx) =>
          selectedLineSet.has(idx)
            ? line.map((word) => ({
                ...word,
                at: null,
              }))
            : line
        ),
        // No box is selected until the first right-arrow. This keeps the
        // retiming target visually neutral during the preparation playback.
        currentIndex: -1,
        selectedLineIndex: firstGroup[0],
        editingLineIndex: firstGroup[0],
        editingEndLineIndex: firstGroup[firstGroup.length - 1],
        isTimingActive: false,
        correctionIndex: null,
        lyricsProcessed: undefined,
        timingBuffer: null,
        timingLineGroups: groups,
        timingGroupIndex: 0,
        lineSelectionMode: false,
        lineShiftArmed: false,
        // Retiming is a destructive preview until it is committed. Keep an
        // immutable copy so Cancel can always restore the exact old values.
        timingSnapshot: snapshot,
      }));

      return { success: true, preRollTime };
    },

    finishTimingGroup: () => {
      const state = get();
      const groups = state.timingLineGroups;
      const nextGroupIndex = state.timingGroupIndex + 1;
      const nextGroup = groups?.[nextGroupIndex];

      if (!nextGroup) return { done: true, preRollTime: 0 };

      const flatLyrics = state.lyricsData.flat();
      const preRollTime = getPreRollTime(nextGroup[0], flatLyrics);
      set({
        currentIndex: -1,
        selectedLineIndex: nextGroup[0],
        editingLineIndex: nextGroup[0],
        editingEndLineIndex: nextGroup[nextGroup.length - 1],
        isTimingActive: false,
        correctionIndex: null,
        playbackIndex: null,
        playbackVisualOverride: null,
        timingGroupIndex: nextGroupIndex,
        timingBuffer: state.timingBuffer
          ? { ...state.timingBuffer, lineIndex: nextGroup[0] }
          : {
              lineIndex: nextGroup[0],
              buffer: new Map(),
            },
      });

      return { done: false, preRollTime };
    },

    cancelTiming: async () => {
      const snapshot = get().timingSnapshot;
      const restoredLyricsData = snapshot
        ? cloneLyricsData(snapshot)
        : undefined;

      set((state) => ({
        ...(restoredLyricsData ? { lyricsData: restoredLyricsData } : {}),
        isTimingActive: false,
        editingLineIndex: null,
        editingEndLineIndex: null,
        timingBuffer: null,
        timingDirection: null,
        correctionIndex: null,
        lyricsProcessed: undefined,
        timingSnapshot: null,
        playbackIndex: null,
        playbackVisualOverride: null,
        timingLineGroups: null,
        timingGroupIndex: 0,
        lineSelectionMode: false,
        selectedLineIndices: [],
        lineSelectionAnchor: null,
        lineShiftArmed: false,
        currentIndex:
          restoredLyricsData && state.selectedLineIndex !== null
            ? restoredLyricsData[state.selectedLineIndex]?.[0]?.index ??
              state.currentIndex
            : state.currentIndex,
      }));

      // Retiming clears the target line as a temporary preview. Restore the
      // derived document and player timeline after rolling that preview back.
      if (restoredLyricsData) {
        get().actions.syncLyricsDocument();
        get().actions.processLyricsForPlayer();
      }
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
        const currentWordData = newBuffer.get(currentWord.index);
        if (!currentWordData || currentWordData.at === null) {
          newBuffer.set(currentWord.index, { at: currentTime });
        }
      }

      const nextWord = flatLyrics[currentIndex + 1];
      if (
        !nextWord ||
        (editingEndLineIndex !== null &&
          nextWord.lineIndex > editingEndLineIndex)
      ) {
        isLineEnd = true;
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
          )?.at;

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
            data.at = null;
            newBuffer.set(wordAfter.index, data);
          }
        }

        const dataToCorrect = newBuffer.get(wordToCorrect.index);
        if (dataToCorrect) {
          dataToCorrect.at = null;
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
          // Starting a retiming session clears its target line as a temporary
          // preview. If no word was stamped, ending the session must restore
          // that preview instead of leaving the whole line empty.
          const restoredLyricsData = prevState.timingSnapshot
            ? cloneLyricsData(prevState.timingSnapshot)
            : undefined;

          return {
            ...(restoredLyricsData
              ? { lyricsData: restoredLyricsData }
              : {}),
            isTimingActive: false,
            editingLineIndex: null,
            editingEndLineIndex: null,
            timingBuffer: null,
            timingDirection: null,
            timingSnapshot: null,
            timingLineGroups: null,
            timingGroupIndex: 0,
            lineSelectionMode: false,
            selectedLineIndices: [],
            lineSelectionAnchor: null,
            lineShiftArmed: false,
          };
        }

        const { buffer } = timingBufferData;

        const newLyricsData = prevState.lyricsData.map((line) =>
          line.map((word) => {
            if (buffer.has(word.index)) {
              const bufferedData = buffer.get(word.index)!;
              return { ...word, at: bufferedData.at };
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
          timingSnapshot: null,
          timingLineGroups: null,
          timingGroupIndex: 0,
          lineSelectionMode: false,
          selectedLineIndices: [],
          lineSelectionAnchor: null,
          lineShiftArmed: false,
        };
      });

      get().actions.syncLyricsDocument();
      get().actions.processLyricsForPlayer();

      // A stamping session is one undo step. The per-word buffer is transient
      // while it runs, so committing here — the moment the buffer is written
      // into the lyrics — is the granularity a person actually wants back.
      if (timingBufferData && timingBufferData.buffer.size > 0) {
        get().actions.commitHistory("ปาดเนื้อร้อง");
      }
    },
  },
});
