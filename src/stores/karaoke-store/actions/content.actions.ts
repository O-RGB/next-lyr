import { StateCreator } from "zustand";
import { processRawLyrics } from "../../../lib/karaoke/utils";
import {
  DEFAULT_SONG_INFO,
  SongInfo,
  ChordEvent,
} from "../../../modules/midi-klyr-parser/lib/processor";
import { LyricWordData } from "@/types/common.type";
import { processLyricsForPlayer } from "../utils";
import { KaraokeState, ContentActions } from "../types";
import { initialTimingState, initialModalState } from "../configs";

export const createContentActions: StateCreator<
  KaraokeState,
  [],
  [],
  { actions: ContentActions }
> = (set, get) => {
  const saveToHistory = () => {
    const state = get();
    const currentHistoryState = {
      lyricsData: state.lyricsData,
      chordsData: state.chordsData,
      metadata: state.metadata,
    };

    set((prevState) => {
      const newPast = [...prevState.history.past, currentHistoryState];
      const MAX_HISTORY_SIZE = 50;
      if (newPast.length > MAX_HISTORY_SIZE) {
        newPast.shift();
      }
      return {
        history: {
          past: newPast,
          future: [],
        },
      };
    });
  };

  return {
    actions: {
      setMetadata: async (metadata: Partial<SongInfo>) => {
        saveToHistory();
        set((state) => ({
          metadata: { ...DEFAULT_SONG_INFO, ...state.metadata, ...metadata },
        }));
        await get().actions.saveCurrentProject();
      },

      processLyricsForPlayer: () => {
        const { lyricsData, mode, playerState } = get();
        const processed = processLyricsForPlayer(
          lyricsData.flat(),
          mode,
          playerState.midiInfo
        );
        set({ lyricsProcessed: processed });
      },

      importLyrics: async (rawText: string) => {
        if (!rawText) return;

        saveToHistory();
        const flatLyrics = processRawLyrics(rawText);

        const groupedLyrics: LyricWordData[][] = [];
        flatLyrics.forEach((word) => {
          if (!groupedLyrics[word.lineIndex]) {
            groupedLyrics[word.lineIndex] = [];
          }
          groupedLyrics[word.lineIndex].push(word);
        });

        set({
          lyricsData: groupedLyrics,
          ...initialTimingState,
        });
        get().actions.processLyricsForPlayer();

        await get().actions.saveCurrentProject();
      },

      addChord: async (newChord: ChordEvent) => {
        saveToHistory();
        set((state) => ({
          chordsData: [...state.chordsData, newChord].sort(
            (a, b) => a.tick - b.tick
          ),
          ...initialModalState,
        }));
        await get().actions.saveCurrentProject();
      },

      updateChord: async (oldTick: number, updatedChord: ChordEvent) => {
        saveToHistory();
        set((state) => ({
          chordsData: state.chordsData
            .map((chord) =>
              chord.tick === oldTick ? { ...updatedChord } : chord
            )
            .sort((a, b) => a.tick - b.tick),
          ...initialModalState,
        }));
        await get().actions.saveCurrentProject();
      },

      deleteChord: async (tickToDelete: number) => {
        saveToHistory();
        set((state) => ({
          chordsData: state.chordsData.filter(
            (chord) => chord.tick !== tickToDelete
          ),
          ...initialModalState,
        }));
        await get().actions.saveCurrentProject();
      },

      updateWordTiming: async (index: number, start: number, end: number) => {
        saveToHistory();
        set((state) => ({
          lyricsData: state.lyricsData.map((line) =>
            line.map((word) =>
              word.index === index
                ? { ...word, start, end, length: end - start }
                : word
            )
          ),
        }));
        get().actions.processLyricsForPlayer();
        await get().actions.saveCurrentProject();
      },

      deleteLine: async (lineIndexToDelete: number) => {
        saveToHistory();
        set((state) => {
          const newLyricsData = state.lyricsData
            .filter((_, index) => index !== lineIndexToDelete)
            .map((line, newLineIndex) =>
              line.map((word) => ({ ...word, lineIndex: newLineIndex }))
            );

          let globalWordIndex = 0;
          const finalLyricsData = newLyricsData.map((line) =>
            line.map((word) => ({ ...word, index: globalWordIndex++ }))
          );

          return { lyricsData: finalLyricsData, selectedLineIndex: null };
        });

        get().actions.processLyricsForPlayer();
        await get().actions.saveCurrentProject();
      },

      updateLine: async (lineIndexToUpdate: number, newText: string) => {
        saveToHistory();
        const newWordsForLine = processRawLyrics(newText).map((word) => ({
          ...word,
          lineIndex: lineIndexToUpdate,
        }));

        set((state) => {
          const newLyricsData = [...state.lyricsData];
          newLyricsData[lineIndexToUpdate] = newWordsForLine;

          let globalWordIndex = 0;
          const finalLyricsData = newLyricsData.map((line) =>
            line.map((word) => ({
              ...word,
              index: globalWordIndex++,
            }))
          );

          return {
            lyricsData: finalLyricsData,
            isEditModalOpen: false,
          };
        });

        get().actions.processLyricsForPlayer();
        await get().actions.saveCurrentProject();
      },

      updateWord: async (
        index: number,
        newWordData: Partial<LyricWordData>
      ) => {
        saveToHistory();
        set((state) => ({
          lyricsData: state.lyricsData.map((line) =>
            line.map((word) =>
              word.index === index ? { ...word, ...newWordData } : word
            )
          ),
        }));

        get().actions.processLyricsForPlayer();
        await get().actions.saveCurrentProject();
      },
    },
  };
};
