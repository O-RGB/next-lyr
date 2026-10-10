import { StateCreator } from "zustand";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import { initialModalState } from "../configs";
import { KaraokeState, ModalActions } from "../types";
import { ChordEvent } from "@/lib/karaoke/midi/types";

export const createModalActions: StateCreator<
  KaraokeState,
  [],
  [],
  { actions: ModalActions }
> = (set, get) => {
  const pauseForEditing = () => {
    usePlayerHandlersStore.getState().handlePauseTiming();
  };
  return {
    actions: {
      selectLine: (lineIndex: number | null) =>
        set({ selectedLineIndex: lineIndex }),

      // ลบ startEditLine action ออก

      openEditModal: () => {
        pauseForEditing();
        set({ isEditModalOpen: true });
      },
      closeEditModal: () => set({ isEditModalOpen: false }),

      openAddModal: (lineIndex: number) => {
        pauseForEditing();
        set({ isAddModalOpen: true, lineIndexToInsertAfter: lineIndex });
      },
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
