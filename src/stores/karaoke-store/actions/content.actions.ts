import { normalizeBlockEffect } from "@next-karaoke/lyrics/effects";
import { IMAGE_TOKEN } from "@/lib/karaoke/inline-content";
import { StateCreator } from "zustand";
import { reconcileLyricsEdit, timingLyrics } from "../timing-session";
import { KaraokeState, ContentActions } from "../types";
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
      lyricsData: timingLyrics(state),
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

    document.effectAtlases = state.lyricsDocument?.effectAtlases;
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
        if (get().isTimingActive || get().editingLineIndex !== null) {
          await get().actions.stopTiming();
        }
        const words = processRawLyrics(rawText, autoSub);
        const groupedLyrics = groupLyricsByLine(words);
        set({
          lyricsData: groupedLyrics,
          lineStickers: {},
          currentIndex: 0,
          selectedLineIndex: 0,
        });
        syncLyricsDocument();
        get().actions.processLyricsForPlayer();
        commit("นำเข้าเนื้อร้อง");
      },
      deleteLine: async (lineIndexToDelete: number) => {
        if (get().isTimingActive || get().editingLineIndex !== null) {
          await get().actions.stopTiming();
        }
        set((state) => {
          const newLyricsData = state.lyricsData.filter(
            (_, index) => index !== lineIndexToDelete
          );

          return reconcileLyricsEdit(state, newLyricsData,
            new Map(state.lyricsData.flatMap((_, index) => index === lineIndexToDelete ? [] : [[index, index > lineIndexToDelete ? index - 1 : index] as const])));
        });
        syncLyricsDocument();
        get().actions.processLyricsForPlayer();
        commit("ลบบรรทัด");
      },
      deleteLines: async (lineIndicesToDelete: number[]) => {
        if (get().isTimingActive || get().editingLineIndex !== null) await get().actions.stopTiming();
        const deleteSet = new Set(lineIndicesToDelete);
        if (deleteSet.size === 0) return;

        set((state) => {
          const remainingLines = state.lyricsData.filter(
            (_, index) => !deleteSet.has(index)
          );
          let nextLine = 0;
          return reconcileLyricsEdit(state, remainingLines,
            new Map(state.lyricsData.flatMap((_, index) => deleteSet.has(index) ? [] : [[index, nextLine++] as const])));
        });
        syncLyricsDocument();
        get().actions.processLyricsForPlayer();
        commit("ลบบรรทัดที่เลือก");
      },
      updateLine: async (
        lineIndexToUpdate: number,
        newText: string,
        vocal: string[]
      ) => {
        set((state) => {
          const currentLine = state.lyricsData[lineIndexToUpdate];
          if (!currentLine) return {};
          const wordsInLine = splitLyricLine(newText);
          let cursor = 0;
          const newWords: LyricWordData[] = wordsInLine.map((text, position) => {
            const match = wordsInLine.length === currentLine.length ? position
              : currentLine.findIndex((word, index) => index >= cursor && word.text === text);
            const original = match >= 0 ? currentLine[match] : undefined;
            if (original) cursor = match + 1;
            return { ...(original ?? { index: -1, at: null }), text,
              vocal: vocal[position] ?? original?.vocal ?? "", lineIndex: lineIndexToUpdate };
          });
          const nextLines = [...state.lyricsData];
          nextLines[lineIndexToUpdate] = newWords;
          return reconcileLyricsEdit(state, nextLines);
        });
        syncLyricsDocument();
        get().actions.processLyricsForPlayer();
        commit("แก้บรรทัด");
      },
      insertLineAfter: async (
        lineIndex: number,
        newText: string,
        vocals: string[] = []
      ) => {
        set((state) => {
          const newLyricsData = [...state.lyricsData];
          const newWords = processRawLyrics(newText, false).map(
            (word, wordIndex) => ({
              ...word,
              vocal: vocals[wordIndex] ?? word.vocal ?? "",
              lineIndex: lineIndex + 1,
              index: -1,
            })
          );
          newLyricsData.splice(lineIndex + 1, 0, newWords);

          return reconcileLyricsEdit(state, newLyricsData,
            new Map(state.lyricsData.map((_, index) => [index, index > lineIndex ? index + 1 : index] as const)));
        });
        syncLyricsDocument();
        get().actions.processLyricsForPlayer();
        commit("เพิ่มบรรทัด");
      },
      replaceLineWords: async (lineIndex, words, sticker) => {
        let changed = false;

        set((state) => {
          const currentLine = state.lyricsData[lineIndex];
          if (!currentLine) return {};

          if (currentLine.length !== words.length) changed = true;
          if (sticker !== undefined && JSON.stringify(state.lineStickers[lineIndex] ?? null) !== JSON.stringify(sticker)) changed = true;

          const currentWords = new Map(
            currentLine.map((word) => [word.index, word])
          );
          const nextLine = words.map((draft) => {
            const originalWord =
              draft.originalIndex === null
                ? undefined
                : currentWords.get(draft.originalIndex);
            const kind = draft.kind ?? "text";
            const nextText = kind === "image" ? IMAGE_TOKEN : draft.text.trim();
            const nextVocal = kind === "image" ? "" : draft.vocal;
            const effect = normalizeBlockEffect(draft.effect);
            const image = kind === "image" ? draft.sticker : undefined;

            if (
              !originalWord ||
              originalWord.text !== nextText ||
              (originalWord.vocal ?? "") !== nextVocal ||
              (originalWord.kind ?? "text") !== kind ||
              originalWord.sticker?.id !== image?.id ||
              JSON.stringify(originalWord.effect) !== JSON.stringify(effect)
            ) {
              changed = true;
            }

            return {
              ...(originalWord ?? { at: null, index: -1 }),
              text: nextText,
              kind,
              sticker: image,
              effect,
              vocal: nextVocal,
              lineIndex,
            };
          });

          if (!changed) return {};

          const nextLyricsData = state.lyricsData.map((line) => [...line]);
          nextLyricsData[lineIndex] = nextLine;

          const updated = reconcileLyricsEdit(state, nextLyricsData);
          if (sticker !== undefined) {
            const lineStickers = { ...updated.lineStickers };
            if (sticker) lineStickers[lineIndex] = sticker;
            else delete lineStickers[lineIndex];
            updated.lineStickers = lineStickers;
          }
          return updated;
        });

        if (!changed) return;
        syncLyricsDocument();
        get().actions.processLyricsForPlayer();
        commit("แก้ไขคำในบรรทัด");
      },
      updateWord: async (
        index: number,
        newWordData: Partial<LyricWordData>
      ) => {
        set((state) => reconcileLyricsEdit(state, state.lyricsData.map((line) =>
          line.map((word) => word.index === index ? { ...word, ...newWordData } : word)
        )));
        syncLyricsDocument();
        get().actions.processLyricsForPlayer();
        commit("แก้คำ");
      },
      addWord: async (lineIndex: number, text: string, vocal = "") => {
        const trimmedText = text.trim();
        if (!trimmedText) return;

        set((state) => {
          const newLyricsData = state.lyricsData.map((line) => [...line]);
          const line = newLyricsData[lineIndex];
          if (!line) return {};

          line.push({
            text: trimmedText,
            vocal,
            at: null,
            index: -1,
            lineIndex,
          });

          return reconcileLyricsEdit(state, newLyricsData);
        });
        syncLyricsDocument();
        get().actions.processLyricsForPlayer();
        commit("เพิ่มคำ");
      },
      deleteWord: async (index: number) => {
        let deleted = false;

        set((state) => {
          const newLyricsData = state.lyricsData.map((line) =>
            line.filter((word) => {
              const keep = word.index !== index;
              if (!keep) deleted = true;
              return keep;
            })
          );

          if (!deleted) return {};

          return reconcileLyricsEdit(state, newLyricsData);
        });

        if (!deleted) return;
        syncLyricsDocument();
        get().actions.processLyricsForPlayer();
        commit("ลบคำ");
      },
      addChord: async (chord: ChordEvent) => {
        const current = get().chordsData;
        const next = [
          ...current.filter((item) => item.tick !== chord.tick),
          chord,
        ].sort((a, b) => a.tick - b.tick);
        if (
          next.length === current.length &&
          next.every(
            (item, index) =>
              item.tick === current[index]?.tick &&
              item.chord === current[index]?.chord
          )
        ) {
          return;
        }
        set({ chordsData: next });
        commit("เพิ่มคอร์ด");
      },
      addChords: async (chords: ChordEvent[]) => {
        if (chords.length === 0) return;

        const current = get().chordsData;
        const ticks = new Set(current.map((item) => item.tick));
        const additions = chords.filter((chord) => {
          if (ticks.has(chord.tick)) return false;
          ticks.add(chord.tick);
          return true;
        });
        if (additions.length === 0) return;

        set({
          chordsData: [...current, ...additions].sort(
            (a, b) => a.tick - b.tick
          ),
        });
        commit("รับคอร์ดแนะนำทั้งหมด");
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
      updateWordTiming: async (index: number, at: number) => {
        set((state) => ({
          lyricsData: state.lyricsData.map((line) =>
            line.map((word) =>
              word.index === index
                ? { ...word, at }
                : word
            )
          ),
        }));
        syncLyricsDocument();
        get().actions.processLyricsForPlayer();
        commit("ปรับเวลาคำ", "word-timing");
      },
      processLyricsForPlayer: () => {
        const state = get();
        const { mode, playerState } = state;
        if (!mode) return;

        const processed = processLyricsForPlayer(
          timingLyrics(state).flat(),
          mode,
          playerState.midi
        );
        set({ lyricsProcessed: processed });
      },
    },
  };
};
