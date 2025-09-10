import { StateCreator } from "zustand";
import { MusicMode } from "@/types/common.type";
import { convertParsedDataForImport, createStoredFileFromFile } from "../utils";
import { resetStateForNewFile } from "../configs";
import { KaraokeState, FileActions } from "../types";
import { groupLyricsByLine } from "@/lib/karaoke/lyrics/convert";
import { DEFAULT_SONG_INFO, IMidiParseResult } from "@/lib/karaoke/midi/types";
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
    const songPpq = state.playerState.midi?.ticksPerBeat;
    const tempos = state.playerState.midi?.tempos;

    if (!songPpq || !tempos) return;
    const { finalWords, convertedChords } = convertParsedDataForImport(
      data,
      isMidi,
      songPpq,
      tempos
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

      loadMidiFile: async (midi: IMidiParseResult, file: File) => {
        const storedFile = await createStoredFileFromFile(file);
        const lyricsExist = get().lyricsData.length > 0;

        set((state) => ({
          ...state,
          playerState: {
            ...state.playerState,
            midi: midi,
            duration: midi.duration,
            storedFile,
          },
          ...(lyricsExist ? {} : resetStateForNewFile(storedFile.name)),
          metadata:
            state.metadata && state.metadata.TITLE
              ? state.metadata
              : {
                  ...DEFAULT_SONG_INFO,
                  ...midi.info,
                },
        }));

        if (!lyricsExist) {
          importParsedData(midi);
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
          metadata:
            state.metadata && state.metadata.TITLE
              ? state.metadata
              : {
                  ...DEFAULT_SONG_INFO,
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
