import { StateCreator } from "zustand";
import {
  DEFAULT_SONG_INFO,
  ParseResult,
} from "../../../modules/midi-klyr-parser/lib/processor";
import { MusicMode, IMidiInfo } from "@/types/common.type";
import { convertParsedDataForImport, createStoredFileFromFile } from "../utils";
import { initialPlayerState, resetStateForNewFile } from "../configs";
import { KaraokeState, FileActions } from "../types";

export const createFileActions: StateCreator<
  KaraokeState,
  [],
  [],
  { actions: FileActions }
> = (set, get) => {
  const importParsedData = (data: any) => {
    const state = get();
    const isMidi = state.mode === "midi";
    const songPpq = state.playerState.midiInfo?.ppq ?? 480;

    const { finalWords, convertedChords } = convertParsedDataForImport(
      data,
      isMidi,
      songPpq
    );

    set({
      lyricsData: finalWords,
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
        set({
          playerState: {
            ...initialPlayerState,
            midiInfo: info,
            duration: info.durationTicks,
            rawFile: file,
            storedFile,
          },
          ...resetStateForNewFile(info.fileName),
          metadata: { ...DEFAULT_SONG_INFO, ...parsedData.info },
        });
        importParsedData(parsedData);
      },

      loadAudioFile: async (
        src: string,
        file: File,
        parsedData: Pick<ParseResult, "lyrics" | "chords" | "info">,
        duration: number
      ) => {
        const storedFile = await createStoredFileFromFile(file);
        set({
          playerState: {
            ...initialPlayerState,
            audioSrc: src,
            rawFile: file,
            storedFile,
            duration,
          },
          ...resetStateForNewFile(file.name),
          metadata: { ...DEFAULT_SONG_INFO, ...parsedData.info },
        });
        importParsedData(parsedData);
      },

      loadVideoFile: async (src: string, file: File, duration: number) => {
        const storedFile = await createStoredFileFromFile(file);
        set({
          playerState: {
            ...initialPlayerState,
            videoSrc: src,
            rawFile: file,
            storedFile,
            duration,
          },
          ...resetStateForNewFile(file.name),
        });
        get().actions.saveCurrentProject();
      },

      loadYoutubeVideo: (id: string, title: string, duration: number) => {
        set({
          playerState: {
            ...initialPlayerState,
            youtubeId: id,
            duration,
            storedFile: null,
            rawFile: null,
          },
          ...resetStateForNewFile(title),
        });
        get().actions.saveCurrentProject();
      },
    },
  };
};
