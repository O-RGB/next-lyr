// update/store/useKaraokeStore.ts
import { create } from "zustand";

import { processRawLyrics, convertCursorToTick } from "../lib/karaoke/utils";
import { ISentence } from "../lib/karaoke/lyrics/types";
import { LyricsRangeArray } from "../lib/karaoke/lyrics/lyrics-mapping";
import {
  TickLyricSegmentGenerator,
  TimestampLyricSegmentGenerator,
} from "../lib/karaoke/cur-generator";
import {
  ChordEvent,
  LyricEvent,
} from "../modules/midi-klyr-parser/lib/processor";
import { LyricWordData, MusicMode, IMidiInfo } from "@/types/common.type";

// --- Helper Function ---
const _processLyricsForPlayer = (
  lyricsData: LyricWordData[],
  mode: MusicMode | null,
  midiInfo: KaraokeState["midiInfo"]
): LyricsRangeArray<ISentence> | undefined => {
  const timedWords = lyricsData.filter(
    (w) => w.start !== null && w.end !== null
  );
  if (timedWords.length === 0) return undefined;

  let timestamps: number[] = [];
  if (mode === "midi" && midiInfo) {
    const generator = new TickLyricSegmentGenerator(midiInfo.bpm, midiInfo.ppq);
    timestamps = generator.generateSegment(timedWords);
  } else {
    const generator = new TimestampLyricSegmentGenerator();
    timestamps = generator.generateSegment(timedWords);
  }

  const lyrInline: string[] = [];
  lyricsData.forEach((data) => {
    if (!lyrInline[data.lineIndex]) lyrInline[data.lineIndex] = "";
    lyrInline[data.lineIndex] += data.name;
  });

  const arrayRange = new LyricsRangeArray<ISentence>();
  let cursorIndex = 0;
  lyrInline
    .map((line) => {
      const lineLength = line.length;
      if (lineLength === 0) return undefined;
      const lineCursor = timestamps.slice(
        cursorIndex,
        cursorIndex + lineLength + 1
      );
      cursorIndex += lineLength + 1;
      if (!lineCursor.length) return undefined;
      const [start, ...valueName] = lineCursor;
      const end = valueName[lineLength - 1] || start;
      const value = { text: line, start, valueName, end };
      arrayRange.push([start, end], value);
      return value;
    })
    .filter((x) => x !== undefined);

  return arrayRange;
};

// --- STATE TYPE ---
export interface KaraokeState {
  // Mode & Data
  mode: MusicMode | null;
  lyricsData: LyricWordData[];
  metadata: { title: string; artist: string };
  audioSrc: string | null;
  videoSrc: string | null;
  youtubeId: string | null;
  audioDuration: number | null;
  midiInfo: IMidiInfo | null;
  chordsData: ChordEvent[];

  // Timing & Playback
  currentIndex: number;
  isTimingActive: boolean;
  editingLineIndex: number | null;
  playbackIndex: number | null;
  correctionIndex: number | null;
  selectedLineIndex: number | null;
  currentTime: number;

  // UI State
  isEditModalOpen: boolean;
  lyricsProcessed?: LyricsRangeArray<ISentence>;
  isChordModalOpen: boolean;
  selectedChord: ChordEvent | null;
  suggestedChordTick: number | null;
  minChordTickRange: number | null; // Added for chord range restriction
  maxChordTickRange: number | null; // Added for chord range restriction

  // Actions
  actions: {
    // Mode & Data
    setMode: (mode: MusicMode) => void;
    setMetadata: (metadata: { title: string; artist: string }) => void;
    setAudioSrc: (src: string, fileName: string) => void;
    setVideoSrc: (src: string, fileName: string) => void;
    setYoutubeId: (url: string) => void;
    setAudioDuration: (duration: number) => void;
    setMidiInfo: (info: {
      fileName: string;
      durationTicks: number;
      ppq: number;
      bpm: number;
    }) => void;
    importLyrics: (rawText: string) => void;
    deleteLine: (lineIndexToDelete: number) => void;
    updateLine: (lineIndexToUpdate: number, newText: string) => void;
    updateWord: (index: number, newWordData: Partial<LyricWordData>) => void;
    importParsedMidiData: (data: {
      lyrics: LyricEvent[][];
      chords: ChordEvent[];
    }) => void;
    addChord: (chord: ChordEvent) => void;
    updateChord: (oldTick: number, newChord: ChordEvent) => void;
    deleteChord: (tickToDelete: number) => void;
    updateWordTiming: (index: number, start: number, end: number) => void;
    processLyricsForPlayer: () => void;

    // Timing & Playback
    startTiming: (currentTime: number) => void;
    recordTiming: (currentTime: number) => { isLineEnd: boolean };
    goToNextWord: () => void;
    correctTimingStep: (newCurrentIndex: number) => { lineStartTime: number };
    stopTiming: () => void;
    setPlaybackIndex: (index: number | null) => void;
    setCurrentIndex: (index: number) => void;
    setCurrentTime: (time: number) => void;
    setCorrectionIndex: (index: number | null) => void;

    // Line Selection & Editing
    selectLine: (lineIndex: number | null) => void;
    startEditLine: (lineIndex: number) => {
      success: boolean;
      firstWordIndex: number;
      preRollTime: number;
    };
    openEditModal: () => void;
    closeEditModal: () => void;

    // Chord Modal
    openChordModal: (
      chord?: ChordEvent,
      suggestedTick?: number,
      minTick?: number, // Added for chord range restriction
      maxTick?: number // Added for chord range restriction
    ) => void;
    closeChordModal: () => void;
  };
}

// --- STORE IMPLEMENTATION ---
export const useKaraokeStore = create<KaraokeState>()((set, get) => {
  const getPreRollTime = (lineIndex: number): number => {
    const { lyricsData } = get();
    if (lineIndex <= 0) return 0;

    const firstWordOfPrevLine = lyricsData.find(
      (w) => w.lineIndex === lineIndex - 1
    );
    if (firstWordOfPrevLine?.start !== null) {
      return firstWordOfPrevLine?.start ?? 0;
    }

    const firstWordOfCurrentLine = lyricsData.find(
      (w) => w.lineIndex === lineIndex
    );
    if (!firstWordOfCurrentLine) return 0;

    const lastTimedWordBefore = lyricsData
      .slice(0, firstWordOfCurrentLine.index)
      .filter((w) => w.end !== null)
      .pop();

    return lastTimedWordBefore?.end ?? 0;
  };

  return {
    // --- INITIAL STATE ---
    mode: null,
    lyricsData: [],
    metadata: { title: "", artist: "" },
    audioSrc: null,
    videoSrc: null,
    youtubeId: null,
    audioDuration: null,
    midiInfo: null,
    chordsData: [],
    currentIndex: 0,
    isTimingActive: false,
    editingLineIndex: null,
    playbackIndex: null,
    correctionIndex: null,
    selectedLineIndex: null,
    currentTime: 0,
    isEditModalOpen: false,
    lyricsProcessed: undefined,
    isChordModalOpen: false,
    selectedChord: null,
    suggestedChordTick: null,
    minChordTickRange: null, // Initial state
    maxChordTickRange: null, // Initial state

    // --- ACTIONS ---
    actions: {
      processLyricsForPlayer: () => {
        const { lyricsData, mode, midiInfo } = get();
        const processed = _processLyricsForPlayer(lyricsData, mode, midiInfo);
        set({ lyricsProcessed: processed });
      },
      setCurrentTime: (time) => set({ currentTime: time }),
      updateWordTiming: (index, start, end) => {
        set((state) => ({
          lyricsData: state.lyricsData.map((word) =>
            word.index === index
              ? { ...word, start, end, length: end - start }
              : word
          ),
        }));
        get().actions.processLyricsForPlayer();
      },
      setMode: (mode) =>
        set({
          mode,
          audioSrc: null,
          videoSrc: null,
          youtubeId: null,
          midiInfo: null,
          audioDuration: null,
          metadata: { title: "", artist: "" },
          lyricsData: [],
          chordsData: [],
          lyricsProcessed: undefined,
        }),
      setVideoSrc: (src, fileName) =>
        set({
          videoSrc: src,
          audioDuration: null,
          metadata: { title: fileName.replace(/\.[^/.]+$/, ""), artist: "" },
        }),
      setYoutubeId: (url) => {
        const getYouTubeId = (url: string): string | null => {
          const regExp =
            /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
          const match = url.match(regExp);
          return match && match[2].length === 11 ? match[2] : null;
        };
        const videoId = getYouTubeId(url);
        if (videoId) {
          set({
            youtubeId: videoId,
            metadata: { title: "YouTube Video", artist: "" },
          });
        } else {
          alert("Invalid YouTube URL.");
        }
      },
      setMetadata: (metadata) => set({ metadata }),
      setAudioSrc: (src, fileName) =>
        set({
          audioSrc: src,
          audioDuration: null,
          metadata: { title: fileName.replace(/\.[^/.]+$/, ""), artist: "" },
        }),
      setAudioDuration: (duration) => set({ audioDuration: duration }),
      setMidiInfo: (info) =>
        set({
          midiInfo: info,
          metadata: {
            title: info.fileName.replace(/\.[^/.]+$/, ""),
            artist: "",
          },
        }),
      importParsedMidiData: (data) => {
        if (!data.lyrics || data.lyrics.length === 0) {
          set({ chordsData: data.chords || [] });
          return;
        }

        const finalWords: LyricWordData[] = [];
        let globalWordIndex = 0;
        const songPpq = get().midiInfo?.ppq ?? 480;

        const flatLyrics = data.lyrics.flat().sort((a, b) => a.tick - b.tick);

        data.lyrics.forEach((line, lineIndex) => {
          line.forEach((wordEvent) => {
            const convertedTick = convertCursorToTick(wordEvent.tick, songPpq);

            const currentFlatIndex = flatLyrics.findIndex(
              (e) => e.tick === wordEvent.tick && e.text === wordEvent.text
            );
            const nextEvent = flatLyrics[currentFlatIndex + 1];
            const endTime = nextEvent
              ? convertCursorToTick(nextEvent.tick, songPpq)
              : convertedTick + songPpq;

            const length = endTime - convertedTick;

            finalWords.push({
              name: wordEvent.text,
              start: convertedTick,
              end: endTime,
              length: length,
              index: globalWordIndex++,
              lineIndex: lineIndex,
            });
          });
        });

        const convertedChords = data.chords
          .map((chord) => ({ ...chord, tick: chord.tick }))
          .sort((a, b) => a.tick - b.tick);

        set({
          lyricsData: finalWords,
          chordsData: convertedChords,
          isTimingActive: false,
          editingLineIndex: null,
          currentIndex: 0,
          correctionIndex: null,
          selectedLineIndex: null,
        });
        get().actions.processLyricsForPlayer();
      },
      addChord: (newChord) => {
        set((state) => ({
          chordsData: [...state.chordsData, newChord].sort(
            (a, b) => a.tick - b.tick
          ),
          isChordModalOpen: false,
          selectedChord: null,
          suggestedChordTick: null,
          minChordTickRange: null, // Reset range on add
          maxChordTickRange: null, // Reset range on add
        }));
      },
      updateChord: (oldTick, updatedChord) => {
        set((state) => ({
          chordsData: state.chordsData
            .map((chord) =>
              chord.tick === oldTick ? { ...updatedChord } : chord
            )
            .sort((a, b) => a.tick - b.tick),
          isChordModalOpen: false,
          selectedChord: null,
          suggestedChordTick: null,
          minChordTickRange: null, // Reset range on update
          maxChordTickRange: null, // Reset range on update
        }));
      },
      deleteChord: (tickToDelete) => {
        set((state) => ({
          chordsData: state.chordsData.filter(
            (chord) => chord.tick !== tickToDelete
          ),
          isChordModalOpen: false,
          selectedChord: null,
          suggestedChordTick: null,
          minChordTickRange: null, // Reset range on delete
          maxChordTickRange: null, // Reset range on delete
        }));
      },
      importLyrics: (rawText) => {
        if (!rawText) return;
        set({
          lyricsData: processRawLyrics(rawText),
          chordsData: [],
          lyricsProcessed: undefined,
          isTimingActive: false,
          editingLineIndex: null,
          currentIndex: 0,
          correctionIndex: null,
          selectedLineIndex: null,
        });
      },
      deleteLine: (lineIndexToDelete) => {
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
      updateLine: (lineIndexToUpdate, newText) => {
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
      updateWord: (index, newWordData) => {
        set((state) => ({
          lyricsData: state.lyricsData.map((word, i) =>
            i === index ? { ...word, ...newWordData } : word
          ),
        }));
        get().actions.processLyricsForPlayer();
      },
      startTiming: (currentTime) => {
        set((state) => {
          if (
            state.lyricsData[state.currentIndex]?.start !== null &&
            state.editingLineIndex === null
          ) {
            return {};
          }
          return {
            isTimingActive: true,
            correctionIndex: null,
            lyricsData: state.lyricsData.map((word, i) =>
              i === state.currentIndex ? { ...word, start: currentTime } : word
            ),
          };
        });
      },
      recordTiming: (currentTime) => {
        let isLineEnd = false;
        set((state) => {
          const newData = [...state.lyricsData];
          const currentWord = newData[state.currentIndex];
          if (currentWord) {
            currentWord.end = currentTime;
            currentWord.length =
              currentWord.end - (currentWord.start ?? currentTime);
          }
          const nextWord = newData[state.currentIndex + 1];
          if (nextWord) {
            nextWord.start = currentTime;
            if (
              currentWord &&
              nextWord.lineIndex !== currentWord.lineIndex &&
              state.editingLineIndex !== null
            ) {
              isLineEnd = true;
            }
          }
          return { lyricsData: newData };
        });

        if (isLineEnd && get().editingLineIndex !== null) {
          get().actions.stopTiming();
        }

        return { isLineEnd };
      },
      goToNextWord: () => {
        set((state) => {
          if (state.currentIndex + 1 < state.lyricsData.length) {
            const nextIndex = state.currentIndex + 1;
            const nextWord = state.lyricsData[nextIndex];
            return {
              currentIndex: nextIndex,
              selectedLineIndex: nextWord
                ? nextWord.lineIndex
                : state.selectedLineIndex,
              correctionIndex: null,
            };
          }
          return { isTimingActive: false, editingLineIndex: null };
        });
      },
      correctTimingStep: (newCurrentIndex) => {
        let lineStartTime = 0;
        set((state) => {
          const wordToCorrect = state.lyricsData[newCurrentIndex];
          if (!wordToCorrect) return {};

          lineStartTime = getPreRollTime(wordToCorrect.lineIndex);

          const newData = [...state.lyricsData];
          if (newData[state.currentIndex]) {
            newData[state.currentIndex].start = null;
          }
          if (newData[newCurrentIndex]) {
            newData[newCurrentIndex].end = null;
            newData[newCurrentIndex].length = 0;
          }
          return {
            lyricsData: newData,
            currentIndex: newCurrentIndex,
            correctionIndex: newCurrentIndex,
            isTimingActive: true,
          };
        });
        return { lineStartTime };
      },
      stopTiming: () => {
        set({ isTimingActive: false, editingLineIndex: null });
        get().actions.processLyricsForPlayer();
      },
      setPlaybackIndex: (index) => set({ playbackIndex: index }),
      setCurrentIndex: (index) => set({ currentIndex: index }),
      setCorrectionIndex: (index) => set({ correctionIndex: index }),
      selectLine: (lineIndex) => set({ selectedLineIndex: lineIndex }),
      startEditLine: (lineIndex) => {
        const { lyricsData } = get();
        const firstWordOfLine = lyricsData.find(
          (w) => w.lineIndex === lineIndex
        );
        if (!firstWordOfLine)
          return { success: false, firstWordIndex: 0, preRollTime: 0 };

        const firstWordIndex = firstWordOfLine.index;
        const preRollTime = getPreRollTime(lineIndex);

        set((state) => ({
          selectedLineIndex: lineIndex,
          lyricsData: state.lyricsData.map((word) =>
            word.lineIndex === lineIndex
              ? { ...word, start: null, end: null, length: 0 }
              : word
          ),
          currentIndex: firstWordIndex,
          editingLineIndex: lineIndex,
          isTimingActive: false,
          correctionIndex: null,
          lyricsProcessed: undefined,
        }));
        return { success: true, firstWordIndex, preRollTime };
      },
      openEditModal: () => set({ isEditModalOpen: true }),
      closeEditModal: () => set({ isEditModalOpen: false }),
      openChordModal: (
        chord,
        suggestedTick,
        minTick,
        maxTick // Modified to accept minTick and maxTick
      ) =>
        set({
          isChordModalOpen: true,
          selectedChord: chord || null,
          suggestedChordTick: suggestedTick || null,
          minChordTickRange: minTick || null, // Set min range
          maxChordTickRange: maxTick || null, // Set max range
        }),
      closeChordModal: () =>
        set({
          isChordModalOpen: false,
          selectedChord: null,
          suggestedChordTick: null,
          minChordTickRange: null, // Reset range on close
          maxChordTickRange: null, // Reset range on close
        }),
    },
  };
});
