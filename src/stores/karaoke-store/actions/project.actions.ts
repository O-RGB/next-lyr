import { StateCreator } from "zustand";

import { Project, ProjectData, updateProject } from "@/lib/database/db";
import { createObjectURLFromStoredFile } from "../utils";
import { initialState, initialPlayerState } from "../configs";
import { KaraokeState, ProjectActions } from "../types";
import {
  lyricsDocumentToWordData,
  wordDataToLyricsDocument,
} from "@/lib/karaoke/lyrics-core/timeline";
import { buildKlyrXml } from "@/lib/karaoke/lyrics-core/xml";
import { initHistory } from "../history";
import { normalizeSoundfontLibrary } from "@/lib/soundfonts";
import { normalizeChordEvents } from "@/lib/karaoke/chords/normalize";

export const createProjectActions: StateCreator<
  KaraokeState,
  [],
  [],
  { actions: ProjectActions }
> = (set, get) => ({
  actions: {
    saveCurrentProject: async (): Promise<void> => {
      const projectId = get().projectId;
      const playerState = get().playerState;
      const lyricsData = get().lyricsData;
      const lyricsDocument = get().lyricsDocument;
      const lyricsXml = get().lyricsXml;
      const chordsData = get().chordsData;
      const metadata = get().metadata;
      const soundfonts = get().soundfonts;
      const activeSoundfontId = get().activeSoundfontId;

      if (!projectId) return;

      const dataToSave: ProjectData = {
        playerState: {
          midi: playerState.midi,
          storedFile: playerState.storedFile,
          duration: playerState.duration,
          youtubeId: playerState.youtubeId,
        },
        lyricsData: lyricsData,
        lyricsDocument,
        lyricsXml,
        chordsData: chordsData,
        metadata: metadata,
        soundfonts,
        activeSoundfontId,
      };

      try {
        await updateProject(projectId, dataToSave);
      } catch (error) {
        console.error("Failed to save project:", error);
        throw error;
      }
    },

    loadProject: (project: Project) => {
      const { playerState, lyricsData, chordsData, metadata } = project.data;
      const normalizedChordsData = normalizeChordEvents(
        chordsData ?? [],
        playerState.midi
      );
      const { soundfonts, activeSoundfontId } = normalizeSoundfontLibrary(
        project.data
      );
      const ppq = playerState.midi?.ticksPerBeat ?? 0;
      const source = project.mode === "midi" ? "KMID" : "MP3";
      const timeBase =
        project.mode === "midi"
          ? { kind: "midi-tick" as const, ppq }
          : { kind: "seconds" as const };
      const lyricsDocument =
        project.data.lyricsDocument ??
        wordDataToLyricsDocument({
          lyricsData,
          source,
          timeBase,
          info: metadata ?? {},
        });
      const restoredLyricsData = lyricsDocumentToWordData(
        lyricsDocument,
        ppq
      );
      const lyricsXml = project.data.lyricsXml ?? buildKlyrXml(lyricsDocument);
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
        lyricsData: restoredLyricsData,
        lyricsDocument,
        lyricsXml,
        chordsData: normalizedChordsData,
        metadata,
        projectId: project.id,
        mode: project.mode,
        soundfonts,
        activeSoundfontId,
        playerState: {
          ...playerState,
          audioSrc,
          videoSrc,
        },
        // Seed the log with what was loaded, so undo cannot reach back past the
        // opening state into an empty document.
        history: initHistory(
          {
            lyricsData: restoredLyricsData,
            lyricsDocument,
            lyricsXml,
            chordsData: normalizedChordsData,
            metadata,
          },
          "เปิดโปรเจกต์"
        ),
      });

      get().actions.processLyricsForPlayer();
    },

    clearProject: () => {
      set({ ...initialState });
    },
  },
});
