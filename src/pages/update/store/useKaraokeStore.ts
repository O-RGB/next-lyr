import { create } from "zustand";
import { LyricWordData } from "../types/type";
import { processRawLyrics, convertCursorToTick } from "../lib/utils";
import {
  TickLyricSegmentGenerator,
  TimestampLyricSegmentGenerator,
} from "../lib/cur-generator";
import { LyrBuilder } from "../lib/lyr-generator";
import { ChordEvent, LyricEvent } from "../lib/midi-tags-decode";

// --- STATE TYPE ---
interface KaraokeState {
  // Mode & Data
  mode: "mp3" | "midi" | null;
  lyricsData: LyricWordData[];
  metadata: { title: string; artist: string };
  audioSrc: string | null;
  midiInfo: {
    fileName: string;
    durationTicks: number;
    ppq: number;
    bpm: number;
  } | null;
  chordsData: ChordEvent[];

  // Timing & Playback
  currentIndex: number;
  isTimingActive: boolean;
  editingLineIndex: number | null;
  playbackIndex: number | null;
  correctionIndex: number | null;
  selectedLineIndex: number | null;

  // UI State
  isEditModalOpen: boolean;
  isPreviewing: boolean;
  previewTimestamps: number[];
  previewLyrics: string[][];

  // Actions
  actions: {
    // Mode & Data
    setMode: (mode: "mp3" | "midi") => void;
    setMetadata: (metadata: { title: string; artist: string }) => void;
    setAudioSrc: (src: string, fileName: string) => void;
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

    // Timing & Playback
    startTiming: (currentTime: number) => void;
    recordTiming: (currentTime: number) => { isLineEnd: boolean };
    goToNextWord: () => void;
    correctTimingStep: (newCurrentIndex: number) => { lineStartTime: number };
    stopTiming: () => void;
    setPlaybackIndex: (index: number | null) => void;
    setCurrentIndex: (index: number) => void;
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

    // Preview
    startPreview: () => void;
    closePreview: () => void;
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
    midiInfo: null,
    chordsData: [],
    currentIndex: 0,
    isTimingActive: false,
    editingLineIndex: null,
    playbackIndex: null,
    correctionIndex: null,
    selectedLineIndex: null,
    isEditModalOpen: false,
    isPreviewing: false,
    previewTimestamps: [],
    previewLyrics: [],

    // --- ACTIONS ---
    actions: {
      setMode: (mode) => set({ mode }),
      setMetadata: (metadata) => set({ metadata }),
      setAudioSrc: (src, fileName) =>
        set({
          audioSrc: src,
          metadata: { title: fileName.replace(/\.[^/.]+$/, ""), artist: "" },
        }),
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

        const convertedChords = data.chords.map((chord) => ({
          ...chord,
          tick: chord.tick,
        }));

        set({
          lyricsData: finalWords,
          chordsData: convertedChords,
          isTimingActive: false,
          editingLineIndex: null,
          currentIndex: 0,
          correctionIndex: null,
          selectedLineIndex: null,
        });
      },
      importLyrics: (rawText) => {
        if (!rawText) return;
        set({
          lyricsData: processRawLyrics(rawText),
          chordsData: [],
          isPreviewing: false,
          isTimingActive: false,
          editingLineIndex: null,
          currentIndex: 0,
          correctionIndex: null,
          selectedLineIndex: null,
        });
      },
      deleteLine: (lineIndexToDelete) => {
        if (
          !confirm(
            `Are you sure you want to delete line ${lineIndexToDelete + 1}?`
          )
        )
          return;

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
            return (a.start ?? a.index) - (b.start ?? b.index);
          });
          return {
            lyricsData: updatedLyrics.map((word, index) => ({
              ...word,
              index,
            })),
            isEditModalOpen: false,
          };
        });
      },
      updateWord: (index, newWordData) => {
        set((state) => ({
          lyricsData: state.lyricsData.map((word, i) =>
            i === index ? { ...word, ...newWordData } : word
          ),
        }));
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
              correctionIndex: null, // Clear correction highlight when moving forward
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
          // Clear timing for the word we are moving FROM
          if (newData[state.currentIndex]) {
            newData[state.currentIndex].start = null;
          }
          // Clear timing for the word we are moving TO
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
        alert("Timing has stopped.");
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
        }));
        return { success: true, firstWordIndex, preRollTime };
      },
      openEditModal: () => set({ isEditModalOpen: true }),
      closeEditModal: () => set({ isEditModalOpen: false }),
      startPreview: () => {
        const { lyricsData, mode, midiInfo, metadata } = get();
        const timedWords = lyricsData.filter(
          (w) => w.start !== null && w.end !== null
        );
        if (timedWords.length === 0) {
          alert("No timed lyrics to preview.");
          return;
        }

        let timestamps: number[] = [];

        if (mode === "midi" && midiInfo) {
          const generator = new TickLyricSegmentGenerator(
            midiInfo.bpm,
            midiInfo.ppq
          );
          timestamps = generator.generateSegment(timedWords);
          generator.export();
          const curFilename = `${
            metadata.title || midiInfo.fileName.split(".")[0]
          }.cur`;
          generator.downloadFile(curFilename);
        } else {
          const generator = new TimestampLyricSegmentGenerator();
          timestamps = generator.generateSegment(timedWords);
        }

        const lyrs: string[][] = [];
        const lyrInline: string[] = [];
        lyricsData.forEach((data) => {
          if (!lyrs[data.lineIndex]) lyrs[data.lineIndex] = [];
          lyrs[data.lineIndex].push(data.name);

          if (!lyrInline[data.lineIndex]) lyrInline[data.lineIndex] = "";
          lyrInline[data.lineIndex] += data.name;
        });

        const lyrBuilder = new LyrBuilder({
          name: metadata.title || "Untitled",
          artist: metadata.artist || "Unknown",
          key: "A",
          lyrics: lyrInline,
        });

        const lyrFilename = `${
          metadata.title || midiInfo?.fileName.split(".")[0] || "song"
        }.lyr`;
        lyrBuilder.downloadFile(lyrFilename);

        set({
          previewTimestamps: timestamps,
          previewLyrics: lyrs,
          isPreviewing: true,
        });
      },
      closePreview: () => set({ isPreviewing: false }),
    },
  };
});
