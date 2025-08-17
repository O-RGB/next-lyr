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
import {
  Project,
  ProjectData,
  updateProject,
  StoredFile,
} from "@/lib/database/db";

type HistoryState = Pick<
  KaraokeState,
  "lyricsData" | "chordsData" | "metadata"
>;

interface PlayerState {
  midiInfo: IMidiInfo | null;
  audioSrc: string | null;
  videoSrc: string | null;
  rawFile: File | null;
  storedFile: StoredFile | null;
  youtubeId: string | null;
  duration: number | null;
}

interface TimingState {
  currentIndex: number;
  isTimingActive: boolean;
  editingLineIndex: number | null;
  playbackIndex: number | null;
  correctionIndex: number | null;
  selectedLineIndex: number | null;
  currentTime: number;
}

interface ModalState {
  isEditModalOpen: boolean;
  isChordModalOpen: boolean;
  selectedChord: ChordEvent | null;
  suggestedChordTick: number | null;
  minChordTickRange: number | null;
  maxChordTickRange: number | null;
}

interface ChordPanelState {
  isChordPanelAutoScrolling: boolean;
  chordPanelCenterTick: number;
  isChordPanelHovered: boolean;
  playFromScrolledPosition: boolean;
}

interface ProjectActions {
  loadProject: (project: Project) => void;
  clearProject: () => void;
  saveCurrentProject: () => void;
}

interface FileActions {
  initializeMode: (mode: MusicMode) => void;
  loadMidiFile: (
    info: IMidiInfo,
    parsedData: Pick<ParseResult, "lyrics" | "chords" | "info">,
    file: File
  ) => void;
  loadAudioFile: (
    src: string,
    file: File,
    parsedData: Pick<ParseResult, "lyrics" | "chords" | "info">,
    duration: number
  ) => void;
  loadVideoFile: (src: string, file: File, duration: number) => void;
  loadYoutubeVideo: (id: string, title: string, duration: number) => void;
}

interface ContentActions {
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
}

interface PlaybackActions {
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
}

interface ModalActions {
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
}

interface ChordPanelActions {
  setIsChordPanelAutoScrolling: (isAuto: boolean) => void;
  setChordPanelCenterTick: (tick: number) => void;
  setIsChordPanelHovered: (isHovered: boolean) => void;
  setPlayFromScrolledPosition: (shouldPlay: boolean) => void;
}

interface HistoryActions {
  undo: () => void;
  redo: () => void;
}

type AllActions = ProjectActions &
  FileActions &
  ContentActions &
  PlaybackActions &
  ModalActions &
  ChordPanelActions &
  HistoryActions;

export interface KaraokeState {
  projectId: number | null;
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
  playFromScrolledPosition: boolean;

  history: {
    past: HistoryState[];
    future: HistoryState[];
  };

  actions: AllActions;
}

const MAX_HISTORY_SIZE = 50;
const DEFAULT_PRE_ROLL_OFFSET = 0.6;
const DEFAULT_CHORD_DURATION = 1;

const initialPlayerState: PlayerState = {
  midiInfo: null,
  audioSrc: null,
  rawFile: null,
  storedFile: null,
  videoSrc: null,
  youtubeId: null,
  duration: null,
};

const initialTimingState: TimingState = {
  currentIndex: 0,
  isTimingActive: false,
  editingLineIndex: null,
  playbackIndex: null,
  correctionIndex: null,
  selectedLineIndex: null,
  currentTime: 0,
};

const initialModalState: ModalState = {
  isEditModalOpen: false,
  isChordModalOpen: false,
  selectedChord: null,
  suggestedChordTick: null,
  minChordTickRange: null,
  maxChordTickRange: null,
};

const initialChordPanelState: ChordPanelState = {
  isChordPanelAutoScrolling: true,
  chordPanelCenterTick: 0,
  isChordPanelHovered: false,
  playFromScrolledPosition: false,
};

const transientState = {
  isPlaying: false,
  lyricsProcessed: undefined,
  history: { past: [], future: [] },
};

const initialState: Omit<KaraokeState, "actions"> = {
  projectId: null,
  mode: null,
  playerState: initialPlayerState,
  lyricsData: [],
  metadata: null,
  chordsData: [],
  ...initialTimingState,
  ...initialModalState,
  ...initialChordPanelState,
  ...transientState,
};

const createStoredFileFromFile = async (file: File): Promise<StoredFile> => {
  const buffer = await file.arrayBuffer();
  return {
    buffer,
    name: file.name,
    type: file.type,
  };
};

const createObjectURLFromStoredFile = (
  storedFile: StoredFile
): { file: File; url: string } => {
  const file = new File([storedFile.buffer], storedFile.name, {
    type: storedFile.type,
  });
  const url = URL.createObjectURL(file);
  return { file, url };
};

const resetStateForNewFile = (fileName: string): Partial<KaraokeState> => ({
  metadata: {
    ...DEFAULT_SONG_INFO,
    TITLE: fileName.replace(/\.[^/.]+$/, ""),
  },
  lyricsData: [],
  chordsData: [],
  ...initialTimingState,
  ...initialModalState,
  ...initialChordPanelState,
  ...transientState,
});

const processLyricsForPlayer = (
  lyricsData: LyricWordData[],
  mode: MusicMode | null,
  midiInfo: IMidiInfo | null
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
  const saveCurrentProject = async () => {
    const state = get();
    if (!state.projectId) return;

    const dataToSave: ProjectData = {
      playerState: {
        midiInfo: state.playerState.midiInfo,
        storedFile: state.playerState.storedFile,
        duration: state.playerState.duration,
        youtubeId: state.playerState.youtubeId,
      },
      lyricsData: state.lyricsData,
      chordsData: state.chordsData,
      metadata: state.metadata,
      currentTime: state.currentTime,
      chordPanelCenterTick: state.chordPanelCenterTick,
      isChordPanelAutoScrolling: state.isChordPanelAutoScrolling,
    };

    try {
      await updateProject(state.projectId, dataToSave);
    } catch (error) {
      console.error("Failed to save project:", error);
    }
  };

  const saveToHistoryAndDB = () => {
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

    saveCurrentProject();
  };

  const getPreRollTime = (lineIndex: number): number => {
    const { lyricsData } = get();
    if (lineIndex <= 0) return 0;

    const firstWordOfPrevLine = lyricsData.find(
      (w) => w.lineIndex === lineIndex - 1
    );
    if (
      firstWordOfPrevLine?.start !== null &&
      firstWordOfPrevLine?.start !== undefined
    ) {
      return firstWordOfPrevLine.start;
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

  const importParsedData = (data: {
    lyrics: LyricEvent[][];
    chords: ChordEvent[];
  }) => {
    if (!data.lyrics || data.lyrics.length === 0) {
      set({ chordsData: data.chords || [] });
      saveCurrentProject();
      return;
    }

    const finalWords: LyricWordData[] = [];
    let globalWordIndex = 0;
    const state = get();
    const isMidi = state.mode === "midi";
    const songPpq = state.playerState.midiInfo?.ppq ?? 480;

    const flatLyrics = data.lyrics.flat().sort((a, b) => a.tick - b.tick);

    data.lyrics.forEach((line, lineIndex) => {
      line.forEach((wordEvent) => {
        const convertedTick = isMidi
          ? convertCursorToTick(wordEvent.tick, songPpq)
          : wordEvent.tick / 1000 - DEFAULT_PRE_ROLL_OFFSET;

        const currentFlatIndex = flatLyrics.findIndex(
          (e) => e.tick === wordEvent.tick && e.text === wordEvent.text
        );
        const nextEvent = flatLyrics[currentFlatIndex + 1];

        let endTime: number;
        if (nextEvent) {
          endTime = isMidi
            ? convertCursorToTick(nextEvent.tick, songPpq)
            : nextEvent.tick / 1000 - DEFAULT_PRE_ROLL_OFFSET;
        } else {
          endTime = isMidi
            ? convertedTick + songPpq
            : convertedTick + DEFAULT_CHORD_DURATION;
        }

        finalWords.push({
          name: wordEvent.text,
          start: convertedTick,
          end: endTime,
          length: endTime - convertedTick,
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
    saveCurrentProject();
  };

  return {
    ...initialState,
    actions: {
      saveCurrentProject,
      loadProject: (project) => {
        const { playerState, ...restOfData } = project.data;
        let audioSrc: string | null = null;
        let videoSrc: string | null = null;
        let rawFile: File | null = null;

        if (playerState.storedFile) {
          const { file, url } = createObjectURLFromStoredFile(
            playerState.storedFile
          );
          rawFile = file;

          if (file.type.startsWith("audio/") || file.type === "audio/midi") {
            audioSrc = url;
          } else if (file.type.startsWith("video/")) {
            videoSrc = url;
          }
        }

        set({
          ...initialState,
          ...restOfData,
          projectId: project.id,
          mode: project.mode,
          playerState: {
            ...initialPlayerState,
            ...playerState,
            rawFile,
            audioSrc,
            videoSrc,
          },
        });

        get().actions.processLyricsForPlayer();
      },

      clearProject: () => {
        set({ ...initialState });
      },

      initializeMode: (mode) => {
        set({ ...initialState, mode });
      },

      loadMidiFile: async (info, parsedData, file) => {
        const storedFile = await createStoredFileFromFile(file);
        set({
          playerState: {
            ...initialPlayerState,
            midiInfo: info,
            duration: info.durationTicks,
            rawFile: file,
            storedFile,
          },
          ...resetStateForNewFile(info.fileName),
          metadata: { ...DEFAULT_SONG_INFO, ...parsedData.info },
        });
        importParsedData(parsedData);
      },

      loadAudioFile: async (src, file, parsedData, duration) => {
        const storedFile = await createStoredFileFromFile(file);
        set({
          playerState: {
            ...initialPlayerState,
            audioSrc: src,
            rawFile: file,
            storedFile,
            duration,
          },
          ...resetStateForNewFile(file.name),
          metadata: { ...DEFAULT_SONG_INFO, ...parsedData.info },
        });
        importParsedData(parsedData);
      },

      loadVideoFile: async (src, file, duration) => {
        const storedFile = await createStoredFileFromFile(file);
        set({
          playerState: {
            ...initialPlayerState,
            videoSrc: src,
            rawFile: file,
            storedFile,
            duration,
          },
          ...resetStateForNewFile(file.name),
        });
        saveCurrentProject();
      },

      loadYoutubeVideo: (id, title, duration) => {
        set({
          playerState: {
            ...initialPlayerState,
            youtubeId: id,
            duration,
            storedFile: null,
            rawFile: null,
          },
          ...resetStateForNewFile(title),
        });
        saveCurrentProject();
      },

      setMetadata: (metadata) => {
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
        saveCurrentProject();
      },

      importLyrics: (rawText) => {
        if (!rawText) return;

        saveToHistoryAndDB();
        set({
          lyricsData: processRawLyrics(rawText),
          ...initialTimingState,
        });
      },

      addChord: (newChord) => {
        saveToHistoryAndDB();
        set((state) => ({
          chordsData: [...state.chordsData, newChord].sort(
            (a, b) => a.tick - b.tick
          ),
          ...initialModalState,
        }));
      },

      updateChord: (oldTick, updatedChord) => {
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

      deleteChord: (tickToDelete) => {
        saveToHistoryAndDB();
        set((state) => ({
          chordsData: state.chordsData.filter(
            (chord) => chord.tick !== tickToDelete
          ),
          ...initialModalState,
        }));
      },

      updateWordTiming: (index, start, end) => {
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

      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setCurrentTime: (time) => set({ currentTime: time }),

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
        saveCurrentProject();
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

        saveCurrentProject();
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

        saveCurrentProject();
        return { lineStartTime };
      },

      stopTiming: () => {
        set({ isTimingActive: false, editingLineIndex: null });
        get().actions.processLyricsForPlayer();
        saveCurrentProject();
      },

      setPlaybackIndex: (index) => set({ playbackIndex: index }),
      setCurrentIndex: (index) => set({ currentIndex: index }),
      setCorrectionIndex: (index) => set({ correctionIndex: index }),

      selectLine: (lineIndex) => set({ selectedLineIndex: lineIndex }),

      startEditLine: (lineIndex) => {
        saveToHistoryAndDB();
        const { lyricsData } = get();
        const firstWordOfLine = lyricsData.find(
          (w) => w.lineIndex === lineIndex
        );

        if (!firstWordOfLine) {
          return { success: false, firstWordIndex: 0, preRollTime: 0 };
        }

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

      closeChordModal: () => set({ ...initialModalState }),

      setIsChordPanelAutoScrolling: (isAuto) =>
        set({ isChordPanelAutoScrolling: isAuto }),
      setChordPanelCenterTick: (tick) => set({ chordPanelCenterTick: tick }),
      setIsChordPanelHovered: (isHovered) =>
        set({ isChordPanelHovered: isHovered }),
      setPlayFromScrolledPosition: (shouldPlay) =>
        set({ playFromScrolledPosition: shouldPlay }),

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
        saveCurrentProject();
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
        saveCurrentProject();
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

      updateLine: (lineIndexToUpdate, newText) => {
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

      updateWord: (index, newWordData) => {
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
});
