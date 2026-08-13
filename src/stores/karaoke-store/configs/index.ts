import { DEFAULT_SONG_INFO } from "@/lib/karaoke/midi/types";
import {
  ChordPanelState,
  KaraokeState,
  ModalState,
  PlayerState,
  TimingState,
} from "../types";
import { initHistory } from "../history";
import { DEFAULT_SOUNDFONT_ENTRY, DEFAULT_SOUNDFONT_ID } from "@/lib/soundfonts";

export const DEFAULT_PRE_ROLL_OFFSET_MIDI = 0.0;
export const DEFAULT_PRE_ROLL_OFFSET_MP3 = 0.3;
export const DEFAULT_CHORD_DURATION = 1;

export const initialPlayerState: PlayerState = {
  midi: null,
  audioSrc: null,
  storedFile: null,
  videoSrc: null,
  youtubeId: null,
  duration: null,
};

export const initialTimingState: TimingState = {
  currentIndex: -1,
  isTimingActive: false,
  editingLineIndex: null,
  editingEndLineIndex: null, // <-- เพิ่มค่าเริ่มต้น
  playbackIndex: null,
  playbackVisualOverride: null,
  timingSnapshot: null,
  correctionIndex: null,
  selectedLineIndex: null,
  currentTime: 0,
  currentTempo: 120,
  timingBuffer: null,
};

export const initialModalState: ModalState = {
  isEditModalOpen: false,
  isAddModalOpen: false,
  lineIndexToInsertAfter: null,
  isChordModalOpen: false,
  selectedChord: null,
  suggestedChordTick: null,
  minChordTickRange: null,
  maxChordTickRange: null,
};

export const initialChordPanelState: ChordPanelState = {
  isChordPanelAutoScrolling: true,
  chordPanelCenterTick: 0,
  isChordPanelHovered: false,
  playFromScrolledPosition: false,
};

export const transientState = {
  isPlaying: false,
  lyricsProcessed: undefined,
  history: initHistory(
    {
      lyricsData: [],
      lyricsDocument: null,
      lyricsXml: "",
      chordsData: [],
      metadata: null,
    },
    "เริ่มต้น"
  ),
};

export const initialState: Omit<KaraokeState, "actions"> = {
  projectId: null,
  mode: null,
  soundfonts: [DEFAULT_SOUNDFONT_ENTRY],
  activeSoundfontId: DEFAULT_SOUNDFONT_ID,
  playerState: initialPlayerState,
  timingDirection: null,
  lyricsData: [],
  lyricsDocument: null,
  lyricsXml: "",
  metadata: null,
  chordsData: [],
  ...initialTimingState,
  ...initialModalState,
  ...initialChordPanelState,
  ...transientState,
};

export const resetStateForNewFile = (
  fileName: string
): Partial<KaraokeState> => ({
  metadata: {
    ...DEFAULT_SONG_INFO,
    TITLE: fileName.replace(/\.[^/.]+$/, ""),
  },
  lyricsData: [],
  lyricsDocument: null,
  lyricsXml: "",
  chordsData: [],
  ...initialTimingState,
  ...initialModalState,
  ...initialChordPanelState,
  ...transientState,
});
