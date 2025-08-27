import { LyricWordData, MusicMode, IMidiInfo } from "@/types/common.type";
import { Project, ProjectData, StoredFile } from "@/lib/database/db";
import {
  ChordEvent,
  ParseResult,
  SongInfo,
} from "@/modules/midi-klyr-parser/lib/processor";
import { LyricsRangeArray } from "@/lib/karaoke/lyrics/lyrics-mapping";
import { ISentence } from "@/lib/karaoke/lyrics/types";

export type HistoryState = Pick<
  KaraokeState,
  "lyricsData" | "chordsData" | "metadata"
>;

export interface PlayerState {
  midiInfo: IMidiInfo | null;
  audioSrc: string | null;
  videoSrc: string | null;
  rawFile: File | null;
  storedFile: StoredFile | null;
  youtubeId: string | null;
  duration: number | null;
}

// 🔽 สร้าง Interface ใหม่สำหรับโครงสร้าง timingBuffer

export interface TiimingBuffer {
  start: number | null;
  end: number | null;
}
export interface TimingBufferData {
  lineIndex: number;
  buffer: Map<number, TiimingBuffer>;
}

export interface TimingState {
  currentIndex: number;
  isTimingActive: boolean;
  editingLineIndex: number | null;
  playbackIndex: number | null;
  correctionIndex: number | null;
  selectedLineIndex: number | null;
  currentTime: number;
  // 🔽 เปลี่ยน Type ของ timingBuffer
  timingBuffer: TimingBufferData | null;
}

export interface ModalState {
  isEditModalOpen: boolean;
  isChordModalOpen: boolean;
  selectedChord: ChordEvent | null;
  suggestedChordTick: number | null;
  minChordTickRange: number | null;
  maxChordTickRange: number | null;
}

export interface ChordPanelState {
  isChordPanelAutoScrolling: boolean;
  chordPanelCenterTick: number;
  isChordPanelHovered: boolean;
  playFromScrolledPosition: boolean;
}

export interface ProjectActions {
  loadProject: (project: Project) => void;
  clearProject: () => void;
  saveCurrentProject: () => Promise<void>;
}

export interface FileActions {
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

export interface ContentActions {
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

export interface PlaybackActions {
  setIsPlaying: (playing: boolean) => void;
  startTiming: (currentTime: number) => void;
  startTimingFromLine: (lineIndex: number) => {
    success: boolean;
    preRollTime: number;
  };
  recordTiming: (currentTime: number) => { isLineEnd: boolean };
  goToNextWord: () => void;
  correctTimingStep: (newCurrentIndex: number) => { lineStartTime: number };
  stopTiming: () => Promise<void>;
  setPlaybackIndex: (index: number | null) => void;
  setCurrentIndex: (index: number) => void;
  setCurrentTime: (time: number) => void;
  setCorrectionIndex: (index: number | null) => void;
}

export interface ModalActions {
  selectLine: (lineIndex: number | null) => void;
  startEditLine: (lineIndex: number) => Promise<{
    success: boolean;
    firstWordIndex: number;
    preRollTime: number;
  }>;
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

export interface ChordPanelActions {
  setIsChordPanelAutoScrolling: (isAuto: boolean) => void;
  setChordPanelCenterTick: (tick: number) => void;
  setIsChordPanelHovered: (isHovered: boolean) => void;
  setPlayFromScrolledPosition: (shouldPlay: boolean) => void;
}

export interface HistoryActions {
  undo: () => void;
  redo: () => void;
}

export type AllActions = ProjectActions &
  FileActions &
  ContentActions &
  PlaybackActions &
  ModalActions &
  ChordPanelActions &
  HistoryActions;

export interface KaraokeState {
  projectId: string | null;
  mode: MusicMode | null;
  playerState: PlayerState;
  lyricsData: LyricWordData[][];
  metadata: SongInfo | null;
  chordsData: ChordEvent[];
  isPlaying: boolean;

  // TimingState
  currentIndex: number;
  isTimingActive: boolean;
  editingLineIndex: number | null;
  playbackIndex: number | null;
  correctionIndex: number | null;
  selectedLineIndex: number | null;
  currentTime: number;
  timingBuffer: TimingBufferData | null;

  // ModalState
  isEditModalOpen: boolean;
  lyricsProcessed?: LyricsRangeArray<ISentence>;
  isChordModalOpen: boolean;
  selectedChord: ChordEvent | null;
  suggestedChordTick: number | null;
  minChordTickRange: number | null;
  maxChordTickRange: number | null;

  // ChordPanelState
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
