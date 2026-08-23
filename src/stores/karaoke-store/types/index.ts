import { LyricWordData, MusicMode } from "@/types/common.type";
import { Project, StoredFile } from "@/lib/database/db";
import { ArrayRange, ISentence } from "@/lib/array-range";
import { ParsedSongData } from "@/lib/karaoke/shared/types";
import {
  ChordEvent,
  IMidiParseResult,
  SongInfo,
} from "@/lib/karaoke/midi/types";
import type { LyricsDocument } from "@/lib/karaoke/lyrics-core/types";
import type { SoundfontEntry } from "@/lib/soundfonts";
import type { History } from "../history";

export type HistoryState = Pick<
  KaraokeState,
  "lyricsData" | "lyricsDocument" | "lyricsXml" | "chordsData" | "metadata"
>;

export interface PlayerState {
  midi: IMidiParseResult | null;
  audioSrc: string | null;
  videoSrc: string | null;
  storedFile: StoredFile | null;
  youtubeId: string | null;
  duration: number | null;
}

export interface TiimingBuffer {
  at: number | null;
}
export interface TimingBufferData {
  lineIndex: number;
  buffer: Map<number, TiimingBuffer>;
}
export interface PlaybackVisualOverride {
  index: number;
  until: number;
}

export interface TimingState {
  currentIndex: number;
  isTimingActive: boolean;
  editingLineIndex: number | null;
  editingEndLineIndex: number | null; // <-- เพิ่ม state นี้
  timingLineGroups: number[][] | null;
  timingGroupIndex: number;
  playbackIndex: number | null;
  playbackVisualOverride: PlaybackVisualOverride | null;
  timingSnapshot: LyricWordData[][] | null;
  correctionIndex: number | null;
  selectedLineIndex: number | null;
  currentTime: number;
  currentTempo: number;
  timingBuffer: TimingBufferData | null;
}

export interface LineSelectionState {
  lineSelectionMode: boolean;
  selectedLineIndices: number[];
  lineSelectionAnchor: number | null;
  lineShiftArmed: boolean;
}

export interface ModalState {
  isEditModalOpen: boolean;
  isAddModalOpen: boolean;
  lineIndexToInsertAfter: number | null;
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

export interface SoundfontActions {
  importSoundfont: (file: File, replaceId?: string) => Promise<void>;
  selectSoundfont: (soundfontId: string) => Promise<void>;
  removeSoundfont: (soundfontId: string) => Promise<void>;
}

export interface FileActions {
  initializeMode: (mode: MusicMode) => void;
  loadMidiFile: (midi: IMidiParseResult, file: File) => void;
  loadAudioFile: (
    src: string,
    file: File,
    parsedData: ParsedSongData,
    duration: number
  ) => void;
  loadVideoFile: (src: string, file: File, duration: number) => void;
  loadYoutubeVideo: (id: string, title: string, duration: number) => void;
}

export interface ContentActions {
  syncLyricsDocument: () => void;
  setMetadata: (metadata: Partial<SongInfo>) => void;
  importLyrics: (rawText: string, autoSub: boolean) => void;
  deleteLine: (lineIndexToDelete: number) => void;
  deleteLines: (lineIndicesToDelete: number[]) => void;
  updateLine: (
    lineIndexToUpdate: number,
    newText: string,
    vocal: string[]
  ) => void;
  insertLineAfter: (
    lineIndex: number,
    newText: string,
    vocals?: string[]
  ) => void;
  updateWord: (index: number, newWordData: Partial<LyricWordData>) => void;
  addWord: (lineIndex: number, text: string, vocal?: string) => void;
  deleteWord: (index: number) => void;
  addChord: (chord: ChordEvent) => void;
  addChords: (chords: ChordEvent[]) => void;
  updateChord: (oldTick: number, newChord: ChordEvent) => void;
  deleteChord: (tickToDelete: number) => void;
  updateWordTiming: (index: number, at: number) => void;
  processLyricsForPlayer: () => void;
}

export interface PlaybackActions {
  setIsPlaying: (playing: boolean) => void;
  startTiming: (currentTime: number) => void;
  startTimingFromLines: (lineIndices: number[]) => {
    success: boolean;
    preRollTime: number;
  };
  cancelTiming: () => Promise<void>;
  finishTimingGroup: () => { done: boolean; preRollTime: number };
  recordTiming: (currentTime: number) => { isLineEnd: boolean };
  goToNextWord: () => void;
  correctTimingStep: (newCurrentIndex: number) => { lineStartTime: number };
  stopTiming: () => Promise<void>;
  setPlaybackIndex: (index: number | null) => void;
  setPlaybackVisualOverride: (
    override: PlaybackVisualOverride | null
  ) => void;
  setCurrentIndex: (index: number) => void;
  setCurrentTime: (time: number) => void;
  setCurrentTempo: (tempo: number) => void;
  setCorrectionIndex: (index: number | null) => void;
}

export interface LineSelectionActions {
  setLineSelectionMode: (enabled: boolean) => void;
  toggleLineSelection: (lineIndex: number, withShift?: boolean) => void;
  clearLineSelection: () => void;
  setLineShiftArmed: (armed: boolean) => void;
  toggleLineShift: () => void;
}

export interface ModalActions {
  selectLine: (lineIndex: number | null) => void;
  openEditModal: () => void;
  closeEditModal: () => void;
  openAddModal: (lineIndex: number) => void;
  closeAddModal: () => void;
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
  /** Jump straight to a logged entry, for the history panel. */
  jumpToHistory: (id: string) => void;
  /**
   * Snapshot the current state under a label. Call it *before* mutating, so
   * the entry describes the state the user can return to.
   */
  commitHistory: (label: string, coalesce?: string) => void;
}

export type AllActions = ProjectActions &
  SoundfontActions &
  FileActions &
  ContentActions &
  PlaybackActions &
  ModalActions &
  LineSelectionActions &
  ChordPanelActions &
  HistoryActions;

export interface KaraokeState {
  projectId: string | null;
  mode: MusicMode | null;
  soundfonts: SoundfontEntry[];
  activeSoundfontId: string;
  playerState: PlayerState;
  lyricsData: LyricWordData[][];
  lyricsDocument: LyricsDocument | null;
  lyricsXml: string;
  metadata: SongInfo | null;
  chordsData: ChordEvent[];
  isPlaying: boolean;

  currentIndex: number;
  isTimingActive: boolean;
  editingLineIndex: number | null;
  editingEndLineIndex: number | null;
  timingLineGroups: number[][] | null;
  timingGroupIndex: number;
  playbackIndex: number | null;
  playbackVisualOverride: PlaybackVisualOverride | null;
  timingSnapshot: LyricWordData[][] | null;
  correctionIndex: number | null;
  selectedLineIndex: number | null;
  currentTime: number;
  currentTempo: number;
  timingBuffer: TimingBufferData | null;
  timingDirection: "forward" | "backward" | null;

  lineSelectionMode: boolean;
  selectedLineIndices: number[];
  lineSelectionAnchor: number | null;
  lineShiftArmed: boolean;

  isEditModalOpen: boolean;
  lyricsProcessed?: ArrayRange<ISentence>;
  isChordModalOpen: boolean;
  isAddModalOpen: boolean;
  lineIndexToInsertAfter: number | null;
  selectedChord: ChordEvent | null;
  suggestedChordTick: number | null;
  minChordTickRange: number | null;
  maxChordTickRange: number | null;

  isChordPanelAutoScrolling: boolean;
  chordPanelCenterTick: number;
  isChordPanelHovered: boolean;
  playFromScrolledPosition: boolean;

  history: History<HistoryState>;

  actions: AllActions;
}
