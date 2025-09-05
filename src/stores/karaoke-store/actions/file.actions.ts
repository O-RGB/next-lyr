import { StateCreator } from "zustand";

import { MusicMode, IMidiInfo } from "@/types/common.type";
import { convertParsedDataForImport, createStoredFileFromFile } from "../utils";
import { resetStateForNewFile } from "../configs";
import { KaraokeState, FileActions } from "../types";
import { groupLyricsByLine } from "@/lib/karaoke/lyrics/convert";
import { DEFAULT_SONG_INFO } from "@/lib/karaoke/midi/types";
import { ParsedSongData } from "@/lib/karaoke/shared/types";

export const createFileActions: StateCreator<
  KaraokeState,
  [],
  [],
  { actions: FileActions }
> = (set, get) => {
  const importParsedData = (data: any) => {
    const state = get();
    if (state.lyricsData && state.lyricsData.length > 0) {
      get().actions.processLyricsForPlayer();
      return;
    }

    const isMidi = state.mode === "midi";
    const songPpq = state.playerState.midiInfo?.ppq;
    const songBpm = state.playerState.midiInfo?.bpm;

    if (!songPpq || !songBpm) return;
    const { finalWords, convertedChords } = convertParsedDataForImport(
      data,
      isMidi,
      songPpq,
      songBpm
    );

    const groupedLyrics = groupLyricsByLine(finalWords);

    set({
      lyricsData: groupedLyrics,
      chordsData: convertedChords,
    });

    get().actions.processLyricsForPlayer();
    get().actions.saveCurrentProject();
  };

  return {
    actions: {
      initializeMode: (mode: MusicMode) => {
        set({ ...get(), mode });
      },

      loadMidiFile: async (
        info: IMidiInfo,
        parsedData: ParsedSongData,
        file: File
      ) => {
        const storedFile = await createStoredFileFromFile(file);
        const lyricsExist = get().lyricsData.length > 0;

        set((state) => ({
          ...state,
          playerState: {
            ...state.playerState,
            midiInfo: info,
            duration: info.durationTicks,
            rawFile: file,
            storedFile,
          },
          ...(lyricsExist ? {} : resetStateForNewFile(info.fileName)),
          metadata: {
            ...DEFAULT_SONG_INFO,
            ...(lyricsExist ? state.metadata : {}),
            ...parsedData.info,
          },
        }));

        if (!lyricsExist) {
          importParsedData(parsedData);
        }
      },

      loadAudioFile: async (
        src: string,
        file: File,
        parsedData: ParsedSongData,
        duration: number
      ) => {
        const storedFile = await createStoredFileFromFile(file);
        const lyricsExist = get().lyricsData.length > 0;

        set((state) => ({
          ...state,
          playerState: {
            ...state.playerState,
            audioSrc: src,
            rawFile: file,
            storedFile,
            duration,
          },
          ...(lyricsExist ? {} : resetStateForNewFile(file.name)),
          metadata: {
            ...DEFAULT_SONG_INFO,
            ...(lyricsExist ? state.metadata : {}),
            ...parsedData.info,
          },
        }));

        if (!lyricsExist) {
          importParsedData(parsedData);
        }
      },

      loadVideoFile: async (src: string, file: File, duration: number) => {
        const storedFile = await createStoredFileFromFile(file);
        const lyricsExist = get().lyricsData.length > 0;

        set((state) => ({
          ...state,
          playerState: {
            ...state.playerState,
            videoSrc: src,
            rawFile: file,
            storedFile,
            duration,
          },
          ...(lyricsExist ? {} : resetStateForNewFile(file.name)),
        }));

        if (!lyricsExist) {
          get().actions.saveCurrentProject();
        }
      },

      loadYoutubeVideo: (id: string, title: string, duration: number) => {
        const lyricsExist = get().lyricsData.length > 0;

        set((state) => ({
          ...state,
          playerState: {
            ...state.playerState,
            youtubeId: id,
            duration,
            storedFile: null,
            rawFile: null,
          },
          ...(lyricsExist ? {} : resetStateForNewFile(title)),
        }));

        if (!lyricsExist) {
          get().actions.saveCurrentProject();
        }
      },
    },
  };
};
