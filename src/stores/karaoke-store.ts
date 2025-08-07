// src/stores/karaoke-store.ts
import { create } from "zustand";
import { convertCursorToTick, processRawLyrics } from "../lib/karaoke/utils";
import { ISentence } from "../lib/karaoke/lyrics/types";
import { LyricsRangeArray } from "../lib/karaoke/lyrics/lyrics-mapping";
import {
  TickLyricSegmentGenerator,
  TimestampLyricSegmentGenerator,
} from "../lib/karaoke/cur-generator";
import {
  ChordEvent,
  DEFAULT_SONG_INFO,
  LyricEvent,
  ParseResult,
  SongInfo,
} from "../modules/midi-klyr-parser/lib/processor";
import { LyricWordData, MusicMode, IMidiInfo } from "@/types/common.type";

type HistoryState = Pick<
  KaraokeState,
  "lyricsData" | "chordsData" | "metadata"
>;

interface PlayerState {
  midiInfo: IMidiInfo | null;
  audioSrc: string | null;
  rawFile: File | null;
  videoSrc: string | null;
  youtubeId: string | null;
  duration: number | null;
}

export interface KaraokeState {
  mode: MusicMode | null;
  playerState: PlayerState;
  lyricsData: LyricWordData[];
  metadata: SongInfo | null;
  chordsData: ChordEvent[];
  isPlaying: boolean;

  currentIndex: number;
  isTimingActive: boolean;
  editingLineIndex: number | null;
  playbackIndex: number | null;
  correctionIndex: number | null;
  selectedLineIndex: number | null;
  currentTime: number;

  isEditModalOpen: boolean;
  lyricsProcessed?: LyricsRangeArray<ISentence>;
  isChordModalOpen: boolean;
  selectedChord: ChordEvent | null;
  suggestedChordTick: number | null;
  minChordTickRange: number | null;
  maxChordTickRange: number | null;
  isChordPanelAutoScrolling: boolean;
  chordPanelCenterTick: number;
  isChordPanelHovered: boolean;
  playFromScrolledPosition: boolean; // vvvvvvvvvv จุดแก้ไข vvvvvvvvvv

  history: {
    past: HistoryState[];
    future: HistoryState[];
  };

  actions: {
    initializeMode: (mode: MusicMode) => void;
    loadMidiFile: (
      info: IMidiInfo,
      parsedData: Pick<ParseResult, "lyrics" | "chords" | "info">
    ) => void;
    loadAudioFile: (
      src: string,
      file: File,
      parsedData: Pick<ParseResult, "lyrics" | "chords" | "info">,
      duration: number
    ) => void;
    loadVideoFile: (src: string, fileName: string, duration: number) => void;
    loadYoutubeVideo: (id: string, title: string, duration: number) => void;

    setMetadata: (metadata: Partial<SongInfo>) => void;
    importLyrics: (rawText: string) => void;
    deleteLine: (lineIndexToDelete: number) => void;
    updateLine: (lineIndexToUpdate: number, newText: string) => void;
    updateWord: (index: number, newWordData: Partial<LyricWordData>) => void;
    addChord: (chord: ChordEvent) => void;
    updateChord: (oldTick: number, newChord: ChordEvent) => void;
    deleteChord: (tickToDelete: number) => void;
    updateWordTiming: (index: number, start: number, end: number) => void;
    processLyricsForPlayer: () => void;
    setIsPlaying: (playing: boolean) => void;

    startTiming: (currentTime: number) => void;
    recordTiming: (currentTime: number) => { isLineEnd: boolean };
    goToNextWord: () => void;
    correctTimingStep: (newCurrentIndex: number) => { lineStartTime: number };
    stopTiming: () => void;
    setPlaybackIndex: (index: number | null) => void;
    setCurrentIndex: (index: number) => void;
    setCurrentTime: (time: number) => void;
    setCorrectionIndex: (index: number | null) => void;

    selectLine: (lineIndex: number | null) => void;
    startEditLine: (lineIndex: number) => {
      success: boolean;
      firstWordIndex: number;
      preRollTime: number;
    };
    openEditModal: () => void;
    closeEditModal: () => void;

    openChordModal: (
      chord?: ChordEvent,
      suggestedTick?: number,
      minTick?: number,
      maxTick?: number
    ) => void;
    closeChordModal: () => void;
    setIsChordPanelAutoScrolling: (isAuto: boolean) => void;
    setChordPanelCenterTick: (tick: number) => void;
    setIsChordPanelHovered: (isHovered: boolean) => void;
    setPlayFromScrolledPosition: (shouldPlay: boolean) => void; // vvvvvvvvvv จุดแก้ไข vvvvvvvvvv

    undo: () => void;
    redo: () => void;
  };
}

const initialPlayerState: PlayerState = {
  midiInfo: null,
  audioSrc: null,
  rawFile: null,
  videoSrc: null,
  youtubeId: null,
  duration: null,
};

const initialState: Omit<KaraokeState, "actions"> = {
  mode: null,
  playerState: initialPlayerState,
  lyricsData: [],
  metadata: null,
  chordsData: [],
  isPlaying: false,
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
  minChordTickRange: null,
  maxChordTickRange: null,
  isChordPanelAutoScrolling: true,
  chordPanelCenterTick: 0,
  isChordPanelHovered: false,
  playFromScrolledPosition: false, // vvvvvvvvvv จุดแก้ไข vvvvvvvvvv
  history: { past: [], future: [] },
};

// ... (โค้ดส่วน _processLyricsForPlayer ไม่เปลี่ยนแปลง) ...
const _processLyricsForPlayer = (
  lyricsData: LyricWordData[],
  mode: MusicMode | null,
  midiInfo: KaraokeState["playerState"]["midiInfo"]
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

export const useKaraokeStore = create<KaraokeState>()((set, get) => {
  const saveToHistory = () => {
    set((state) => {
      const { history, lyricsData, chordsData, metadata } = state;
      const currentHistoryState: HistoryState = {
        lyricsData,
        chordsData,
        metadata,
      };

      const newPast: HistoryState[] = [...history.past, currentHistoryState];

      if (newPast.length > 50) {
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

  const resetStateForNewFile = (fileName: string) => {
    return {
      metadata: {
        ...DEFAULT_SONG_INFO,
        TITLE: fileName.replace(/\.[^/.]+$/, ""),
      },
      lyricsData: [],
      chordsData: [],
      lyricsProcessed: undefined,
      history: { past: [], future: [] },
      isPlaying: false,
      currentIndex: 0,
      currentTime: 0,
      selectedLineIndex: null,
      editingLineIndex: null,
      playbackIndex: null,
      correctionIndex: null,
      playFromScrolledPosition: false, // vvvvvvvvvv จุดแก้ไข vvvvvvvvvv
    };
  };

  const importParsedData = (data: {
    lyrics: LyricEvent[][];
    chords: ChordEvent[];
  }) => {
    if (!data.lyrics || data.lyrics.length === 0) {
      set({ chordsData: data.chords || [] });
      return;
    }

    const finalWords: LyricWordData[] = [];
    let globalWordIndex = 0;
    const isMidi = get().mode === "midi";
    const songPpq = get().playerState.midiInfo?.ppq ?? 480;

    const flatLyrics = data.lyrics.flat().sort((a, b) => a.tick - b.tick);

    data.lyrics.forEach((line, lineIndex) => {
      line.forEach((wordEvent) => {
        const isMidi = get().mode === "midi";
        const convertedTick = isMidi
          ? convertCursorToTick(wordEvent.tick, songPpq)
          : wordEvent.tick / 1000 - 0.6;

        const currentFlatIndex = flatLyrics.findIndex(
          (e) => e.tick === wordEvent.tick && e.text === wordEvent.text
        );
        const nextEvent = flatLyrics[currentFlatIndex + 1];

        let endTime;
        if (nextEvent) {
          endTime = isMidi
            ? convertCursorToTick(nextEvent.tick, songPpq)
            : nextEvent.tick / 1000 - 0.6;
        } else {
          endTime = isMidi ? convertedTick + songPpq : convertedTick + 1;
        }

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
      .map((chord) => ({
        ...chord,
        tick: isMidi ? chord.tick : chord.tick / 1000,
      }))
      .sort((a, b) => a.tick - b.tick);

    set({
      lyricsData: finalWords,
      chordsData: convertedChords,
    });
    get().actions.processLyricsForPlayer();
  };

  return {
    ...initialState,
    actions: {
      initializeMode: (mode) => {
        set({
          ...initialState,
          mode: mode,
        });
      },
      loadMidiFile: (info, parsedData) => {
        set({
          playerState: {
            ...initialPlayerState,
            midiInfo: info,
            duration: info.durationTicks,
          },
          ...resetStateForNewFile(info.fileName),
          metadata: { ...DEFAULT_SONG_INFO, ...parsedData.info },
        });
        importParsedData(parsedData);
      },
      loadAudioFile: (src, file, parsedData, duration) => {
        set({
          playerState: {
            ...initialPlayerState,
            audioSrc: src,
            rawFile: file,
            duration,
          },
          ...resetStateForNewFile(file.name),
          metadata: { ...DEFAULT_SONG_INFO, ...parsedData.info },
        });
        importParsedData(parsedData);
      },
      loadVideoFile: (src, fileName, duration) => {
        set({
          playerState: { ...initialPlayerState, videoSrc: src, duration },
          ...resetStateForNewFile(fileName),
        });
      },
      loadYoutubeVideo: (id, title, duration) => {
        set({
          playerState: { ...initialPlayerState, youtubeId: id, duration },
          ...resetStateForNewFile(title),
        });
      },
      setMetadata: (metadata) => {
        saveToHistory();
        set((state) => ({
          metadata: { ...DEFAULT_SONG_INFO, ...state.metadata, ...metadata },
        }));
      },
      processLyricsForPlayer: () => {
        const { lyricsData, mode, playerState } = get();
        const processed = _processLyricsForPlayer(
          lyricsData,
          mode,
          playerState.midiInfo
        );
        set({ lyricsProcessed: processed });
      },
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setCurrentTime: (time) => set({ currentTime: time }),
      importLyrics: (rawText) => {
        saveToHistory();
        if (!rawText) return;
        set({
          lyricsData: processRawLyrics(rawText),
          isTimingActive: false,
          editingLineIndex: null,
          currentIndex: 0,
          correctionIndex: null,
          selectedLineIndex: null,
          currentTime: 0, // รีเซ็ตเวลาเป็น 0
          playbackIndex: null, // รีเซ็ต highlight การเล่นเพลง
        });
      },
      addChord: (newChord) => {
        saveToHistory();
        set((state) => ({
          chordsData: [...state.chordsData, newChord].sort(
            (a, b) => a.tick - b.tick
          ),
          isChordModalOpen: false,
          selectedChord: null,
          suggestedChordTick: null,
          minChordTickRange: null,
          maxChordTickRange: null,
        }));
      },
      updateChord: (oldTick, updatedChord) => {
        saveToHistory();
        set((state) => ({
          chordsData: state.chordsData
            .map((chord) =>
              chord.tick === oldTick ? { ...updatedChord } : chord
            )
            .sort((a, b) => a.tick - b.tick),
          isChordModalOpen: false,
          selectedChord: null,
          suggestedChordTick: null,
          minChordTickRange: null,
          maxChordTickRange: null,
        }));
      },
      deleteChord: (tickToDelete) => {
        saveToHistory();
        set((state) => ({
          chordsData: state.chordsData.filter(
            (chord) => chord.tick !== tickToDelete
          ),
          isChordModalOpen: false,
          selectedChord: null,
          suggestedChordTick: null,
          minChordTickRange: null,
          maxChordTickRange: null,
        }));
      },
      updateWordTiming: (index, start, end) => {
        saveToHistory();
        set((state) => ({
          lyricsData: state.lyricsData.map((word) =>
            word.index === index
              ? { ...word, start, end, length: end - start }
              : word
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
        saveToHistory();
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
      openChordModal: (chord, suggestedTick, minTick, maxTick) =>
        set({
          isChordModalOpen: true,
          selectedChord: chord || null,
          suggestedChordTick: suggestedTick || null,
          minChordTickRange: minTick || null,
          maxChordTickRange: maxTick || null,
        }),
      closeChordModal: () =>
        set({
          isChordModalOpen: false,
          selectedChord: null,
          suggestedChordTick: null,
          minChordTickRange: null,
          maxChordTickRange: null,
        }),
      setIsChordPanelAutoScrolling: (isAuto) =>
        set({ isChordPanelAutoScrolling: isAuto }),
      setChordPanelCenterTick: (tick) => set({ chordPanelCenterTick: tick }),
      setIsChordPanelHovered: (isHovered) =>
        set({ isChordPanelHovered: isHovered }),
      // vvvvvvvvvv จุดแก้ไข vvvvvvvvvv
      setPlayFromScrolledPosition: (shouldPlay) =>
        set({ playFromScrolledPosition: shouldPlay }),
      // ^^^^^^^^^^ สิ้นสุดจุดแก้ไข ^^^^^^^^^^
      undo: () => {
        set((state) => {
          const { past, future } = state.history;
          if (past.length === 0) return {};

          const previousState = past[past.length - 1];
          const newPast = past.slice(0, past.length - 1);

          const currentState: HistoryState = {
            lyricsData: state.lyricsData,
            chordsData: state.chordsData,
            metadata: state.metadata,
          };

          return {
            ...previousState,
            history: {
              past: newPast,
              future: [currentState, ...future],
            },
          };
        });
        get().actions.processLyricsForPlayer();
      },
      redo: () => {
        set((state) => {
          const { past, future } = state.history;
          if (future.length === 0) return {};

          const nextState = future[0];
          const newFuture = future.slice(1);

          const currentState: HistoryState = {
            lyricsData: state.lyricsData,
            chordsData: state.chordsData,
            metadata: state.metadata,
          };

          return {
            ...nextState,
            history: {
              past: [...past, currentState],
              future: newFuture,
            },
          };
        });
        get().actions.processLyricsForPlayer();
      },
      deleteLine: (lineIndexToDelete: number) => {
        saveToHistory();
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
        saveToHistory();
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
        saveToHistory();
        set((state) => ({
          lyricsData: state.lyricsData.map((word, i) =>
            i === index ? { ...word, ...newWordData } : word
          ),
        }));
        get().actions.processLyricsForPlayer();
      },
    },
  };
});
