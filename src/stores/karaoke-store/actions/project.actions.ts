import { migrateInlineStickers } from "@/lib/karaoke/inline-content";
import { StateCreator } from "zustand";
import { timingLyrics } from "../timing-session";

import { Project, ProjectData, updateProject, saveTimingDraft, nextProjectRevision } from "@/lib/database/db";
import { createObjectURLFromStoredFile } from "../utils";
import { initialState } from "../configs";
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
    saveTimingDraft: async () => {
      const state = get();
      if (!state.projectId) return;
      state.actions.syncLyricsDocument();
      const next = get();
      await saveTimingDraft({
        projectId: state.projectId,
        lyricsData: timingLyrics(next),
        lineStickers: next.lineStickers,
        lyricsDocument: next.lyricsDocument,
        lyricsXml: next.lyricsXml,
        updatedAt: nextProjectRevision(),
      });
    },
    saveCurrentProject: async (): Promise<void> => {
      const projectId = get().projectId;
      if (!projectId) return;
      get().actions.syncLyricsDocument();
      const playerState = get().playerState;
      const lyricsData = timingLyrics(get());
      const lyricsDocument = get().lyricsDocument;
      const lyricsXml = get().lyricsXml;
      const chordsData = get().chordsData;
      const metadata = get().metadata;
      const soundfonts = get().soundfonts;
      const activeSoundfontId = get().activeSoundfontId;

      const dataToSave: ProjectData = {
        playerState: {
          midi: playerState.midi,
          storedFile: playerState.storedFile,
          duration: playerState.duration,
          youtubeId: playerState.youtubeId,
        },
        lyricsData: lyricsData,
        lineStickers: get().lineStickers,
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
      const loadedDocument =
        project.data.lyricsDocument ??
        wordDataToLyricsDocument({
          lyricsData,
          source,
          timeBase,
          info: metadata ?? {},
        });
      const restoredLyricsData = migrateInlineStickers(lyricsDocumentToWordData(
        loadedDocument,
        ppq
      ), project.data.lineStickers ?? {});
      const lyricsDocument = wordDataToLyricsDocument({ lyricsData: restoredLyricsData, source, timeBase, info: metadata ?? {} });
      const lyricsXml = buildKlyrXml(lyricsDocument);
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
        lineStickers: {},
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
            lineStickers: {},
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
