import { StateCreator } from "zustand";
import {
  DEFAULT_SONG_INFO,
  ParseResult,
} from "../../../modules/midi-klyr-parser/lib/processor";
import { MusicMode, IMidiInfo } from "@/types/common.type";
import { convertParsedDataForImport, createStoredFileFromFile } from "../utils";
import { initialPlayerState, resetStateForNewFile } from "../configs";
import { KaraokeState, FileActions } from "../types";
import { groupLyricsByLine } from "@/lib/karaoke/lyrics/lyrics-convert";

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
    const songPpq = state.playerState.midiInfo?.ppq ?? 480;

    const { finalWords, convertedChords } = convertParsedDataForImport(
      data,
      isMidi,
      songPpq
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
        parsedData: Pick<ParseResult, "lyrics" | "chords" | "info">,
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
        parsedData: Pick<ParseResult, "lyrics" | "chords" | "info">,
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
