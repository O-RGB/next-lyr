import { StateCreator } from "zustand";
import { getPreRollTime } from "../utils";
import { MAX_HISTORY_SIZE, initialModalState } from "../configs";
import { KaraokeState, ModalActions, HistoryState } from "../types";
import { ChordEvent } from "@/lib/karaoke/midi/types";

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

      // ลบ startEditLine action ออก

      openEditModal: () => set({ isEditModalOpen: true }),
      closeEditModal: () => set({ isEditModalOpen: false }),

      openAddModal: (lineIndex: number) =>
        set({ isAddModalOpen: true, lineIndexToInsertAfter: lineIndex }),
      closeAddModal: () =>
        set({ isAddModalOpen: false, lineIndexToInsertAfter: null }),

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
