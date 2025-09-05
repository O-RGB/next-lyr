import { StateCreator } from "zustand";
import { KaraokeState, ContentActions, HistoryState } from "../types";
import { SongInfo, ChordEvent } from "@/modules/midi-klyr-parser/lib/processor";
import { LyricWordData } from "@/types/common.type";
import { processRawLyrics } from "@/lib/karaoke/utils";
import { groupLyricsByLine } from "@/lib/karaoke/lyrics/convert";
import { processLyricsForPlayer } from "../utils";
import { MAX_HISTORY_SIZE } from "../configs";

export const createContentActions: StateCreator<
  KaraokeState,
  [],
  [],
  { actions: ContentActions }
> = (set, get) => {
  const saveToHistoryAndDB = async () => {
    const state = get();
    const currentHistoryState: HistoryState = {
      lyricsData: state.lyricsData,
      chordsData: state.chordsData,
      metadata: state.metadata,
    };

    set((prevState) => {
      const newPast = [...prevState.history.past, currentHistoryState];
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

    await get().actions.saveCurrentProject();
  };

  return {
    actions: {
      setMetadata: async (metadata: Partial<SongInfo>) => {
        await saveToHistoryAndDB();
        set((state) => ({
          metadata: { ...(state.metadata as SongInfo), ...metadata },
        }));
        await get().actions.saveCurrentProject();
      },
      importLyrics: async (rawText: string) => {
        await saveToHistoryAndDB();
        const words = processRawLyrics(rawText);
        set({
          lyricsData: groupLyricsByLine(words),
          currentIndex: 0,
          selectedLineIndex: 0,
        });
        get().actions.processLyricsForPlayer();
      },
      deleteLine: async (lineIndexToDelete: number) => {
        await saveToHistoryAndDB();
        set((state) => {
          const newLyricsData = state.lyricsData.filter(
            (_, index) => index !== lineIndexToDelete
          );
          // Re-index everything after the deleted line
          const flatLyrics = newLyricsData
            .map((line, newLineIndex) =>
              line.map((word) => ({ ...word, lineIndex: newLineIndex }))
            )
            .flat();

          // Re-calculate global index
          let globalIndex = 0;
          flatLyrics.forEach((word) => (word.index = globalIndex++));

          return { lyricsData: groupLyricsByLine(flatLyrics) };
        });
        get().actions.processLyricsForPlayer();
      },
      updateLine: async (lineIndexToUpdate: number, newText: string) => {
        await saveToHistoryAndDB();
        set((state) => {
          const newLyricsData = [...state.lyricsData];
          const wordsInLine = newText.split("|");
          const firstWordOfLine = state.lyricsData[lineIndexToUpdate]?.[0];

          if (!firstWordOfLine) return {};

          const newWords: LyricWordData[] = wordsInLine.map(
            (wordText, wordIndex) => ({
              name: wordText,
              start: null,
              end: null,
              length: 0,
              index: firstWordOfLine.index + wordIndex,
              lineIndex: lineIndexToUpdate,
            })
          );

          newLyricsData[lineIndexToUpdate] = newWords;

          // Re-index all subsequent words
          let currentGlobalIndex = firstWordOfLine.index + newWords.length;
          for (let i = lineIndexToUpdate + 1; i < newLyricsData.length; i++) {
            for (let j = 0; j < newLyricsData[i].length; j++) {
              newLyricsData[i][j].index = currentGlobalIndex++;
            }
          }

          return { lyricsData: newLyricsData };
        });
        get().actions.processLyricsForPlayer();
      },
      insertLineAfter: async (lineIndex: number, newText: string) => {
        await saveToHistoryAndDB();
        set((state) => {
          const newLyricsData = [...state.lyricsData];
          const newWords = processRawLyrics(newText).map((w) => ({
            ...w,
            lineIndex: lineIndex + 1,
          }));
          newLyricsData.splice(lineIndex + 1, 0, newWords);

          // Re-index everything from the inserted line onwards
          let globalIndex = 0;
          const reIndexedFlat = newLyricsData
            .map((line, newLineIndex) =>
              line.map((word) => ({ ...word, lineIndex: newLineIndex }))
            )
            .flat();

          reIndexedFlat.forEach((word) => (word.index = globalIndex++));
          return { lyricsData: groupLyricsByLine(reIndexedFlat) };
        });
        get().actions.processLyricsForPlayer();
      },
      updateWord: async (
        index: number,
        newWordData: Partial<LyricWordData>
      ) => {
        await saveToHistoryAndDB();
        set((state) => ({
          lyricsData: state.lyricsData.map((line) =>
            line.map((word) =>
              word.index === index ? { ...word, ...newWordData } : word
            )
          ),
        }));
        get().actions.processLyricsForPlayer();
      },
      addChord: async (chord: ChordEvent) => {
        await saveToHistoryAndDB();
        set((state) => ({
          chordsData: [...state.chordsData, chord].sort(
            (a, b) => a.tick - b.tick
          ),
        }));
      },
      updateChord: async (oldTick: number, newChord: ChordEvent) => {
        await saveToHistoryAndDB();
        set((state) => ({
          chordsData: state.chordsData
            .map((c) => (c.tick === oldTick ? newChord : c))
            .sort((a, b) => a.tick - b.tick),
        }));
      },
      deleteChord: async (tickToDelete: number) => {
        await saveToHistoryAndDB();
        set((state) => ({
          chordsData: state.chordsData.filter((c) => c.tick !== tickToDelete),
        }));
      },
      updateWordTiming: async (index: number, start: number, end: number) => {
        await saveToHistoryAndDB();
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
    },
  };
};
