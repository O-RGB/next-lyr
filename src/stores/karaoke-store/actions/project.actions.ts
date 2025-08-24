import { StateCreator } from "zustand";

import { Project, ProjectData, updateProject } from "@/lib/database/db";
import { createObjectURLFromStoredFile } from "../utils";
import { initialState, initialPlayerState } from "../configs";
import { KaraokeState, ProjectActions } from "../types";

export const createProjectActions: StateCreator<
  KaraokeState,
  [],
  [],
  { actions: ProjectActions }
> = (set, get) => ({
  actions: {
    saveCurrentProject: async () => {
      const projectId = get().projectId;
      const playerState = get().playerState;
      const lyricsData = get().lyricsData;
      const chordsData = get().chordsData;
      const metadata = get().metadata;

      if (!projectId) return;

      const dataToSave: ProjectData = {
        playerState: {
          midiInfo: playerState.midiInfo,
          storedFile: playerState.storedFile,
          duration: playerState.duration,
          youtubeId: playerState.youtubeId,
        },
        lyricsData: lyricsData,
        chordsData: chordsData,
        metadata: metadata,
      };

      try {
        console.log("saveCurrentProject");
        await updateProject(projectId, dataToSave);
      } catch (error) {
        console.error("Failed to save project:", error);
      }
    },

    loadProject: (project: Project) => {
      const { playerState, ...restOfData } = project.data;
      let audioSrc: string | null = null;
      let videoSrc: string | null = null;
      let rawFile: File | null = null;

      if (playerState.storedFile) {
        const { file, url } = createObjectURLFromStoredFile(
          playerState.storedFile
        );
        rawFile = file;

        if (file.type.startsWith("audio/") || file.type === "audio/midi") {
          audioSrc = url;
        } else if (file.type.startsWith("video/")) {
          videoSrc = url;
        }
      }

      set({
        ...initialState,
        ...restOfData,
        projectId: project.id,
        mode: project.mode,
        playerState: {
          ...initialPlayerState,
          ...playerState,
          rawFile,
          audioSrc,
          videoSrc,
        },
      });

      get().actions.processLyricsForPlayer();
    },

    clearProject: () => {
      set({ ...initialState });
    },
  },
});
