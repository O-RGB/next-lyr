import { StateCreator } from "zustand";
import { KaraokeState, HistoryActions, HistoryState } from "../types";

export const createHistoryActions: StateCreator<
  KaraokeState,
  [],
  [],
  { actions: HistoryActions }
> = (set, get) => ({
  actions: {
    undo: () => {
      set((state) => {
        const { past, future } = state.history;
        if (past.length === 0) return {};

        const previousState = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);
        const currentState: HistoryState = {
          lyricsData: state.lyricsData,
          chordsData: state.chordsData,
          metadata: state.metadata,
        };

        return {
          ...previousState,
          history: {
            past: newPast,
            future: [currentState, ...future],
          },
        };
      });

      get().actions.processLyricsForPlayer();
      get().actions.saveCurrentProject();
    },

    redo: () => {
      set((state) => {
        const { past, future } = state.history;
        if (future.length === 0) return {};

        const nextState = future[0];
        const newFuture = future.slice(1);
        const currentState: HistoryState = {
          lyricsData: state.lyricsData,
          chordsData: state.chordsData,
          metadata: state.metadata,
        };

        return {
          ...nextState,
          history: {
            past: [...past, currentState],
            future: newFuture,
          },
        };
      });

      get().actions.processLyricsForPlayer();
      get().actions.saveCurrentProject();
    },
  },
});
