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
  const saveToHistoryAndDB = () => {
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

    get().actions.saveCurrentProject();
  };

  return {
    actions: {
      setMetadata: (metadata: Partial<SongInfo>) => {
        saveToHistoryAndDB();
        set((state) => ({
          metadata: { ...DEFAULT_SONG_INFO, ...state.metadata, ...metadata },
        }));
      },

      processLyricsForPlayer: () => {
        const { lyricsData, mode, playerState } = get();
        const processed = processLyricsForPlayer(
          lyricsData,
          mode,
          playerState.midiInfo
        );
        set({ lyricsProcessed: processed });
        get().actions.saveCurrentProject();
      },

      importLyrics: (rawText: string) => {
        if (!rawText) return;

        saveToHistoryAndDB();
        set({
          lyricsData: processRawLyrics(rawText),
          ...initialTimingState,
        });
      },

      addChord: (newChord: ChordEvent) => {
        saveToHistoryAndDB();
        set((state) => ({
          chordsData: [...state.chordsData, newChord].sort(
            (a, b) => a.tick - b.tick
          ),
          ...initialModalState,
        }));
      },

      updateChord: (oldTick: number, updatedChord: ChordEvent) => {
        saveToHistoryAndDB();
        set((state) => ({
          chordsData: state.chordsData
            .map((chord) =>
              chord.tick === oldTick ? { ...updatedChord } : chord
            )
            .sort((a, b) => a.tick - b.tick),
          ...initialModalState,
        }));
      },

      deleteChord: (tickToDelete: number) => {
        saveToHistoryAndDB();
        set((state) => ({
          chordsData: state.chordsData.filter(
            (chord) => chord.tick !== tickToDelete
          ),
          ...initialModalState,
        }));
      },

      updateWordTiming: (index: number, start: number, end: number) => {
        saveToHistoryAndDB();
        set((state) => ({
          lyricsData: state.lyricsData.map((word) =>
            word.index === index
              ? { ...word, start, end, length: end - start }
              : word
          ),
        }));
        get().actions.processLyricsForPlayer();
      },

      deleteLine: (lineIndexToDelete: number) => {
        saveToHistoryAndDB();
        set((state) => {
          const remainingWords = state.lyricsData.filter(
            (word) => word.lineIndex !== lineIndexToDelete
          );
          const newLyricsData: LyricWordData[] = [];
          let globalWordIndex = 0;
          const lineMap = new Map<number, number>();
          let newLineIndexCounter = 0;

          remainingWords.forEach((word) => {
            let newLineIndex;
            if (lineMap.has(word.lineIndex)) {
              newLineIndex = lineMap.get(word.lineIndex)!;
            } else {
              newLineIndex = newLineIndexCounter;
              lineMap.set(word.lineIndex, newLineIndex);
              newLineIndexCounter++;
            }

            newLyricsData.push({
              ...word,
              lineIndex: newLineIndex,
              index: globalWordIndex++,
            });
          });

          return { lyricsData: newLyricsData, selectedLineIndex: null };
        });

        get().actions.processLyricsForPlayer();
      },

      updateLine: (lineIndexToUpdate: number, newText: string) => {
        saveToHistoryAndDB();
        const newWordsForLine = processRawLyrics(newText).map((word) => ({
          ...word,
          lineIndex: lineIndexToUpdate,
        }));

        set((state) => {
          const otherLinesWords = state.lyricsData.filter(
            (word) => word.lineIndex !== lineIndexToUpdate
          );
          const updatedLyrics = [...otherLinesWords, ...newWordsForLine];

          updatedLyrics.sort((a, b) => {
            if (a.lineIndex !== b.lineIndex) {
              return a.lineIndex - b.lineIndex;
            }
            const aTime = a.start !== null ? a.start : a.index;
            const bTime = b.start !== null ? b.start : b.index;
            return aTime - bTime;
          });

          return {
            lyricsData: updatedLyrics.map((word, index) => ({
              ...word,
              index,
            })),
            isEditModalOpen: false,
          };
        });

        get().actions.processLyricsForPlayer();
      },

      updateWord: (index: number, newWordData: Partial<LyricWordData>) => {
        saveToHistoryAndDB();
        set((state) => ({
          lyricsData: state.lyricsData.map((word, i) =>
            i === index ? { ...word, ...newWordData } : word
          ),
        }));

        get().actions.processLyricsForPlayer();
      },
    },
  };
};
