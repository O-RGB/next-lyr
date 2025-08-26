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
  const saveToHistoryAndDB = async () => {
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

    await get().actions.saveCurrentProject();
  };

  return {
    actions: {
      selectLine: (lineIndex: number | null) =>
        set({ selectedLineIndex: lineIndex }),

      startEditLine: async (lineIndex: number) => {
        await saveToHistoryAndDB();
        const { lyricsData } = get();

        // --- START: โค้ดที่แก้ไข ---
        const flatLyrics = lyricsData.flat();
        const firstWordOfLine = flatLyrics.find(
          (w) => w.lineIndex === lineIndex
        );
        // --- END: โค้ดที่แก้ไข ---

        if (!firstWordOfLine) {
          return { success: false, firstWordIndex: 0, preRollTime: 0 };
        }

        const firstWordIndex = firstWordOfLine.index;

        // --- START: โค้ดที่แก้ไข ---
        const preRollTime = getPreRollTime(lineIndex, flatLyrics);
        // --- END: โค้ดที่แก้ไข ---

        set((state) => ({
          selectedLineIndex: lineIndex,
          // --- START: โค้ดที่แก้ไข ---
          lyricsData: state.lyricsData.map((line, idx) =>
            idx === lineIndex
              ? line.map((word) => ({
                  ...word,
                  start: null,
                  end: null,
                  length: 0,
                }))
              : line
          ),
          // --- END: โค้ดที่แก้ไข ---
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
