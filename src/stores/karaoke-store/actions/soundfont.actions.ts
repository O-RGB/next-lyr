import { StateCreator } from "zustand";

import {
  DEFAULT_SOUNDFONT_ENTRY,
  DEFAULT_SOUNDFONT_ID,
  importSoundfontFile,
  removeSoundfontFile,
} from "@/lib/soundfonts";
import { KaraokeState, SoundfontActions } from "../types";

export const createSoundfontActions: StateCreator<
  KaraokeState,
  [],
  [],
  { actions: SoundfontActions }
> = (set, get) => ({
  actions: {
    importSoundfont: async (file, replaceId) => {
      const projectId = get().projectId;
      if (!projectId) throw new Error("กรุณาเปิดโปรเจกต์ก่อนนำเข้า SoundFont");

      const entry = await importSoundfontFile(file, projectId, replaceId);
      const currentEntries = get().soundfonts.length
        ? get().soundfonts
        : [DEFAULT_SOUNDFONT_ENTRY];
      const soundfonts = currentEntries.some((item) => item.id === entry.id)
        ? currentEntries.map((item) => (item.id === entry.id ? entry : item))
        : [...currentEntries, entry];

      set({ soundfonts, activeSoundfontId: entry.id });
      await get().actions.saveCurrentProject();
    },

    selectSoundfont: async (soundfontId) => {
      if (!get().soundfonts.some((entry) => entry.id === soundfontId)) return;
      set({ activeSoundfontId: soundfontId });
      await get().actions.saveCurrentProject();
    },

    removeSoundfont: async (soundfontId) => {
      if (soundfontId === DEFAULT_SOUNDFONT_ID) return;
      const projectId = get().projectId;
      if (!projectId) return;

      await removeSoundfontFile(projectId, soundfontId);
      const soundfonts = get().soundfonts.filter(
        (entry) => entry.id !== soundfontId
      );
      const activeSoundfontId =
        get().activeSoundfontId === soundfontId
          ? DEFAULT_SOUNDFONT_ID
          : get().activeSoundfontId;

      set({ soundfonts, activeSoundfontId });
      await get().actions.saveCurrentProject();
    },
  },
});
