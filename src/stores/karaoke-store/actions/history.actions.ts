import { StateCreator } from "zustand";
import { timingLyrics } from "../timing-session";

import {
  canRedo,
  canUndo,
  currentState,
  jumpTo,
  pushHistory,
  redo as redoHistory,
  undo as undoHistory,
} from "../history";
import { HistoryActions, HistoryState, KaraokeState } from "../types";

/** The slice of editor state that undo restores. */
export function snapshot(state: KaraokeState): HistoryState {
  return {
    lyricsData: timingLyrics(state),
    lineStickers: state.lineStickers,
    lyricsDocument: state.lyricsDocument,
    lyricsXml: state.lyricsXml,
    chordsData: state.chordsData,
    metadata: state.metadata,
  };
}

export const createHistoryActions: StateCreator<
  KaraokeState,
  [],
  [],
  { actions: HistoryActions }
> = (set, get) => {
  /**
   * Persisting is debounced away from the history push.
   *
   * Every commit used to `await` a full project write to IndexedDB, so a
   * coalesced gesture such as typing a title wrote the whole project on every
   * keystroke. The log is authoritative in memory; the database only has to
   * catch up.
   */
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      const state = get();
      const save = state.isTimingActive || state.editingLineIndex !== null
        ? state.actions.saveTimingDraft : state.actions.saveCurrentProject;
      void save().catch((error) => console.error("Could not autosave project:", error));
    }, 400);
  };

  /** Move to a different point in the log and adopt the state stored there. */
  const applyHistory = (next: KaraokeState["history"]) => {
    const restored = currentState(next);
    set({ ...restored, history: next });
    get().actions.processLyricsForPlayer();
    scheduleSave();
  };

  return {
    actions: {
      commitHistory: (label, coalesce) => {
        set((state) => ({
          history: pushHistory(state.history, snapshot(state), {
            label,
            coalesce,
          }),
        }));
        scheduleSave();
      },

      undo: () => {
        if (get().isTimingActive || get().editingLineIndex !== null) return;
        const history = get().history;
        if (!canUndo(history)) return;
        applyHistory(undoHistory(history));
      },

      redo: () => {
        if (get().isTimingActive || get().editingLineIndex !== null) return;
        const history = get().history;
        if (!canRedo(history)) return;
        applyHistory(redoHistory(history));
      },

      jumpToHistory: (id) => {
        if (get().isTimingActive || get().editingLineIndex !== null) return;
        const history = get().history;
        const next = jumpTo(history, id);
        if (next !== history) applyHistory(next);
      },
    },
  };
};
