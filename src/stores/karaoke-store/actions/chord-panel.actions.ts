import { StateCreator } from "zustand";
import { KaraokeState, ChordPanelActions } from "../types";

export const createChordPanelActions: StateCreator<
  KaraokeState,
  [],
  [],
  { actions: ChordPanelActions }
> = (set, get) => ({
  actions: {
    setIsChordPanelAutoScrolling: (isAuto: boolean) =>
      set({ isChordPanelAutoScrolling: isAuto }),

    setChordPanelCenterTick: (tick: number) =>
      set({ chordPanelCenterTick: tick }),

    setIsChordPanelHovered: (isHovered: boolean) =>
      set({ isChordPanelHovered: isHovered }),

    setPlayFromScrolledPosition: (shouldPlay: boolean) =>
      set({ playFromScrolledPosition: shouldPlay }),
  },
});
