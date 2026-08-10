import { StateCreator } from "zustand";
import { KaraokeState, ContentActions, HistoryState } from "../types";
import { LyricWordData } from "@/types/common.type";
import { processRawLyrics, splitLyricLine } from "@/lib/karaoke/utils";
import { groupLyricsByLine } from "@/lib/karaoke/lyrics/convert";
import { processLyricsForPlayer } from "../utils";
import { MAX_HISTORY_SIZE } from "../configs";
import { ChordEvent, SongInfo } from "@/lib/karaoke/midi/types";
import {
  wordDataToLyricsDocument,
} from "@/lib/karaoke/lyrics-core/timeline";
import { buildKlyrXml } from "@/lib/karaoke/lyrics-core/xml";

export const createContentActions: StateCreator<
  KaraokeState,
  [],
  [],
  { actions: ContentActions }
> = (set, get) => {
  const syncLyricsDocument = () => {
    const state = get();
    const document = wordDataToLyricsDocument({
      lyricsData: state.lyricsData,
      source:
        state.mode === "midi"
          ? "KMID"
          : state.mode === "mp3"
          ? "MP3"
          : "LYRIC_EDITOR",
      timeBase:
        state.mode === "midi"
          ? {
              kind: "midi-tick",
              ppq: state.playerState.midi?.ticksPerBeat ?? 0,
              tempoChanges: state.playerState.midi?.tempos?.ranges.map(
                (range) => ({
                  tick: range.key[0],
                  bpm: range.value.value.bpm,
                })
              ),
            }
          : { kind: "seconds" },
      info: state.metadata ?? {},
    });

    set({ lyricsDocument: document, lyricsXml: buildKlyrXml(document) });
  };

  const saveToHistoryAndDB = async () => {
    const state = get();
    const currentHistoryState: HistoryState = {
      lyricsData: state.lyricsData,
      lyricsDocument: state.lyricsDocument,
      lyricsXml: state.lyricsXml,
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
      syncLyricsDocument,
      setMetadata: async (metadata: Partial<SongInfo>) => {
        console.log("Update Metadata....");
        await saveToHistoryAndDB();
        set((state) => ({
          metadata: { ...(state.metadata as SongInfo), ...metadata },
        }));
        syncLyricsDocument();
        await get().actions.saveCurrentProject();
      },
      importLyrics: async (rawText: string, autoSub: boolean) => {
        await saveToHistoryAndDB();
        const words = processRawLyrics(rawText, autoSub);
        const groupedLyrics = groupLyricsByLine(words);
        set({
          lyricsData: groupedLyrics,
          currentIndex: 0,
          selectedLineIndex: 0,
        });
        syncLyricsDocument();
        await get().actions.saveCurrentProject();
        get().actions.processLyricsForPlayer();
      },
      deleteLine: async (lineIndexToDelete: number) => {
        await saveToHistoryAndDB();
        set((state) => {
          const newLyricsData = state.lyricsData.filter(
            (_, index) => index !== lineIndexToDelete
          );

          const flatLyrics = newLyricsData
            .map((line, newLineIndex) =>
              line.map((word) => ({ ...word, lineIndex: newLineIndex }))
            )
            .flat();

          let globalIndex = 0;
          flatLyrics.forEach((word) => (word.index = globalIndex++));

          return { lyricsData: groupLyricsByLine(flatLyrics) };
        });
        syncLyricsDocument();
        await get().actions.saveCurrentProject();
        get().actions.processLyricsForPlayer();
      },
      updateLine: async (
        lineIndexToUpdate: number,
        newText: string,
        vocal: string[]
      ) => {
        await saveToHistoryAndDB();
        set((state) => {
          const newLyricsData = [...state.lyricsData];
          const wordsInLine = splitLyricLine(newText);
          const firstWordOfLine = state.lyricsData[lineIndexToUpdate]?.[0];

          if (!firstWordOfLine) return {};

          const newWords: LyricWordData[] = wordsInLine.map(
            (wordText, wordIndex) => ({
              text: wordText,
              vocal: vocal[wordIndex] ? vocal[wordIndex] : "",
              start: null,
              end: null,
              length: 0,
              index: firstWordOfLine.index + wordIndex,
              lineIndex: lineIndexToUpdate,
            })
          );

          newLyricsData[lineIndexToUpdate] = newWords;

          let currentGlobalIndex = firstWordOfLine.index + newWords.length;
          for (let i = lineIndexToUpdate + 1; i < newLyricsData.length; i++) {
            for (let j = 0; j < newLyricsData[i].length; j++) {
              newLyricsData[i][j].index = currentGlobalIndex++;
            }
          }

          return { lyricsData: newLyricsData };
        });
        syncLyricsDocument();
        await get().actions.saveCurrentProject();
        get().actions.processLyricsForPlayer();
      },
      insertLineAfter: async (lineIndex: number, newText: string) => {
        await saveToHistoryAndDB();
        set((state) => {
          const newLyricsData = [...state.lyricsData];
          const newWords = processRawLyrics(newText, false).map((w) => ({
            ...w,
            lineIndex: lineIndex + 1,
          }));
          newLyricsData.splice(lineIndex + 1, 0, newWords);

          let globalIndex = 0;
          const reIndexedFlat = newLyricsData
            .map((line, newLineIndex) =>
              line.map((word) => ({ ...word, lineIndex: newLineIndex }))
            )
            .flat();

          reIndexedFlat.forEach((word) => (word.index = globalIndex++));
          return { lyricsData: groupLyricsByLine(reIndexedFlat) };
        });
        syncLyricsDocument();
        await get().actions.saveCurrentProject();
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
        syncLyricsDocument();
        await get().actions.saveCurrentProject();
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
        syncLyricsDocument();
        await get().actions.saveCurrentProject();
        get().actions.processLyricsForPlayer();
      },
      processLyricsForPlayer: () => {
        const { lyricsData, mode, playerState } = get();
        if (!mode) return;

        const processed = processLyricsForPlayer(
          lyricsData.flat(),
          mode,
          playerState.midi
        );
        set({ lyricsProcessed: processed });
      },
    },
  };
};
