import { StateCreator } from "zustand";
import { KaraokeState, ContentActions, HistoryState } from "../types";
import { LyricWordData } from "@/types/common.type";
import { processRawLyrics, splitLyricLine } from "@/lib/karaoke/utils";
import { groupLyricsByLine } from "@/lib/karaoke/lyrics/convert";
import { processLyricsForPlayer } from "../utils";
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

  /** Record the state produced by an action, under a label. */
  const commit = (label: string, coalesce?: string) =>
    get().actions.commitHistory(label, coalesce);

  return {
    actions: {
      syncLyricsDocument,
      setMetadata: async (metadata: Partial<SongInfo>) => {
        const currentMetadata = get().metadata;
        const changed = (Object.keys(metadata) as (keyof SongInfo)[]).some(
          (key) => currentMetadata?.[key] !== metadata[key]
        );

        // A blur caused by moving focus is not an edit. Avoid creating new
        // metadata/document/history references when all values are unchanged.
        if (!changed) return;

        set((state) => ({
          metadata: { ...(state.metadata as SongInfo), ...metadata },
        }));
        syncLyricsDocument();
        // Typing a title is one undo step, not one per keystroke.
        commit("แก้ข้อมูลเพลง", "metadata");
      },
      importLyrics: async (rawText: string, autoSub: boolean) => {
        const words = processRawLyrics(rawText, autoSub);
        const groupedLyrics = groupLyricsByLine(words);
        set({
          lyricsData: groupedLyrics,
          currentIndex: 0,
          selectedLineIndex: 0,
        });
        syncLyricsDocument();
        get().actions.processLyricsForPlayer();
        commit("นำเข้าเนื้อร้อง");
      },
      deleteLine: async (lineIndexToDelete: number) => {
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
        get().actions.processLyricsForPlayer();
        commit("ลบบรรทัด");
      },
      updateLine: async (
        lineIndexToUpdate: number,
        newText: string,
        vocal: string[]
      ) => {
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
        get().actions.processLyricsForPlayer();
        commit("แก้บรรทัด");
      },
      insertLineAfter: async (lineIndex: number, newText: string) => {
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
        get().actions.processLyricsForPlayer();
        commit("เพิ่มบรรทัด");
      },
      updateWord: async (
        index: number,
        newWordData: Partial<LyricWordData>
      ) => {
        set((state) => ({
          lyricsData: state.lyricsData.map((line) =>
            line.map((word) =>
              word.index === index ? { ...word, ...newWordData } : word
            )
          ),
        }));
        syncLyricsDocument();
        get().actions.processLyricsForPlayer();
        commit("แก้คำ");
      },
      addChord: async (chord: ChordEvent) => {
        set((state) => ({
          chordsData: [...state.chordsData, chord].sort(
            (a, b) => a.tick - b.tick
          ),
        }));
        commit("เพิ่มคอร์ด");
      },
      updateChord: async (oldTick: number, newChord: ChordEvent) => {
        set((state) => ({
          chordsData: state.chordsData
            .map((c) => (c.tick === oldTick ? newChord : c))
            .sort((a, b) => a.tick - b.tick),
        }));
        commit("แก้คอร์ด");
      },
      deleteChord: async (tickToDelete: number) => {
        set((state) => ({
          chordsData: state.chordsData.filter((c) => c.tick !== tickToDelete),
        }));
        commit("ลบคอร์ด");
      },
      updateWordTiming: async (index: number, start: number, end: number) => {
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
        get().actions.processLyricsForPlayer();
        commit("ปรับเวลาคำ", "word-timing");
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
