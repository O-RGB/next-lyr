import { StateCreator } from "zustand";
import { ChordEvent } from "../../../modules/midi-klyr-parser/lib/processor";
import { getPreRollTime } from "../utils";
import { MAX_HISTORY_SIZE, initialModalState } from "../configs";
import { KaraokeState, ModalActions, HistoryState } from "../types";

export const createModalActions: StateCreator<
  KaraokeState,
  [],
  [],
  { actions: ModalActions }
> = (set, get) => {
  const saveToHistoryAndDB = () => {
    const state = get();
    const currentHistoryState: HistoryState = {
      lyricsData: state.lyricsData,
      chordsData: state.chordsData,
      metadata: state.metadata,
    };

    set((prevState) => {
      const newPast = [...prevState.history.past, currentHistoryState];
      if (newPast.length > MAX_HISTORY_SIZE) {
        newPast.shift();
      }
      return {
        history: {
          past: newPast,
          future: [],
        },
      };
    });

    get().actions.saveCurrentProject();
  };

  return {
    actions: {
      selectLine: (lineIndex: number | null) =>
        set({ selectedLineIndex: lineIndex }),

      startEditLine: (lineIndex: number) => {
        saveToHistoryAndDB();
        const { lyricsData } = get();
        const firstWordOfLine = lyricsData.find(
          (w) => w.lineIndex === lineIndex
        );

        if (!firstWordOfLine) {
          return { success: false, firstWordIndex: 0, preRollTime: 0 };
        }

        const firstWordIndex = firstWordOfLine.index;
        const preRollTime = getPreRollTime(lineIndex, lyricsData);

        set((state) => ({
          selectedLineIndex: lineIndex,
          lyricsData: state.lyricsData.map((word) =>
            word.lineIndex === lineIndex
              ? { ...word, start: null, end: null, length: 0 }
              : word
          ),
          currentIndex: firstWordIndex,
          editingLineIndex: lineIndex,
          isTimingActive: false,
          correctionIndex: null,
          lyricsProcessed: undefined,
        }));

        return { success: true, firstWordIndex, preRollTime };
      },

      openEditModal: () => set({ isEditModalOpen: true }),
      closeEditModal: () => set({ isEditModalOpen: false }),

      openChordModal: (
        chord?: ChordEvent,
        suggestedTick?: number,
        minTick?: number,
        maxTick?: number
      ) =>
        set({
          isChordModalOpen: true,
          selectedChord: chord || null,
          suggestedChordTick: suggestedTick || null,
          minChordTickRange: minTick || null,
          maxChordTickRange: maxTick || null,
        }),

      closeChordModal: () => set({ ...initialModalState }),
    },
  };
};
