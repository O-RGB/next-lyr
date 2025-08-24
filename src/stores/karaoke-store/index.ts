import { create } from "zustand";
import { createChordPanelActions } from "./actions/chord-panel.actions";
import { createContentActions } from "./actions/content.actions";
import { createFileActions } from "./actions/file.actions";
import { createHistoryActions } from "./actions/history.actions";
import { initialState } from "./configs";
import { createModalActions } from "./actions/modal.actions";
import { createPlaybackActions } from "./actions/playback.actions";
import { createProjectActions } from "./actions/project.actions";
import { KaraokeState } from "./types";

export const useKaraokeStore = create<KaraokeState>()((set, get) => ({
  ...initialState,
  actions: {
    // Project actions
    ...createProjectActions(set, get, undefined as any).actions,

    // File actions
    ...createFileActions(set, get, undefined as any).actions,

    // Content actions
    ...createContentActions(set, get, undefined as any).actions,

    // Playback actions
    ...createPlaybackActions(set, get, undefined as any).actions,

    // Modal actions
    ...createModalActions(set, get, undefined as any).actions,

    // Chord panel actions
    ...createChordPanelActions(set, get, undefined as any).actions,

    // History actions
    ...createHistoryActions(set, get, undefined as any).actions,
  },
}));
