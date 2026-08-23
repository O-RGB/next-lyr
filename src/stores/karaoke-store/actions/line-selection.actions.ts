import { StateCreator } from "zustand";
import {
  KaraokeState,
  LineSelectionActions,
} from "../types";

export const createLineSelectionActions: StateCreator<
  KaraokeState,
  [],
  [],
  { actions: LineSelectionActions }
> = (set, get) => ({
  actions: {
    setLineSelectionMode: (enabled) =>
      set(
        enabled
          ? {
              lineSelectionMode: true,
              selectedLineIndices: [],
              lineSelectionAnchor: null,
              lineShiftArmed: false,
            }
          : {
              lineSelectionMode: false,
              selectedLineIndices: [],
              lineSelectionAnchor: null,
              lineShiftArmed: false,
            }
      ),

    toggleLineSelection: (lineIndex, withShift = false) => {
      const state = get();
      if (!state.lineSelectionMode || state.isPlaying || state.isTimingActive) {
        return;
      }

      if (
        (state.lineShiftArmed || withShift) &&
        state.lineSelectionAnchor !== null
      ) {
        const from = Math.min(state.lineSelectionAnchor, lineIndex);
        const to = Math.max(state.lineSelectionAnchor, lineIndex);
        set({
          selectedLineIndices: Array.from(
            { length: to - from + 1 },
            (_, index) => from + index
          ),
          lineSelectionAnchor: lineIndex,
          lineShiftArmed: false,
        });
        return;
      }

      const selected = new Set(state.selectedLineIndices);
      if (selected.has(lineIndex)) selected.delete(lineIndex);
      else selected.add(lineIndex);

      set({
        selectedLineIndices: [...selected].sort((a, b) => a - b),
        lineSelectionAnchor: lineIndex,
        lineShiftArmed: false,
      });
    },

    clearLineSelection: () =>
      set({
        selectedLineIndices: [],
        lineSelectionAnchor: null,
        lineShiftArmed: false,
      }),

    setLineShiftArmed: (armed) => {
      const state = get();
      if (!state.lineSelectionMode || state.lineSelectionAnchor === null) {
        return;
      }
      set({ lineShiftArmed: armed });
    },

    toggleLineShift: () => {
      const state = get();
      if (!state.lineSelectionMode || state.lineSelectionAnchor === null) {
        return;
      }
      set({ lineShiftArmed: !state.lineShiftArmed });
    },
  },
});
