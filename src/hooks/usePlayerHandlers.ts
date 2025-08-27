import { create } from "zustand";
import { calculateSeekTime } from "@/components/ui/panel";
import { PlayerControls } from "./useKeyboardControls";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { usePlayerSetupStore } from "./usePlayerSetup";

interface PlayerHandlersState {
  handleStop: () => void;
  handleWordClick: (index: number) => void;
  handleEditLine: (lineIndex: number) => void;
  handleRetiming: (lineIndex: number) => void;
}

export const usePlayerHandlersStore = create<PlayerHandlersState>(
  (set, get) => ({
    handleStop: async () => {
      const { playerControls } = usePlayerSetupStore.getState();
      if (!playerControls) {
        console.warn("[handleStop] Aborted: playerControls not available.");
        return;
      }

      playerControls.pause();
      playerControls.seek(0);
      useKaraokeStore.getState().actions.setIsPlaying(false);
      await useKaraokeStore.getState().actions.stopTiming();
      useKaraokeStore.getState().actions.setPlaybackIndex(null);
      useKaraokeStore.getState().actions.setCurrentIndex(0);
      useKaraokeStore.getState().actions.setCorrectionIndex(null);
    },
    handleWordClick: async (index) => {
      const { lyricsData, mode } = useKaraokeStore.getState();
      const { playerControls } = usePlayerSetupStore.getState();

      const flatLyrics = lyricsData.flat();
      const word = flatLyrics.find((w) => w.index === index);

      if (!word || !playerControls) {
        console.warn(
          "[handleWordClick] Aborted: Word data or playerControls not available.",
          { word, playerControls }
        );
        return;
      }

      const seekTo = calculateSeekTime(word, flatLyrics, mode, index);

      if (seekTo !== null) {
        useKaraokeStore.getState().actions.setIsChordPanelAutoScrolling(true);
        await useKaraokeStore.getState().actions.stopTiming();
        playerControls.seek(seekTo);

        if (!playerControls.isPlaying()) {
          playerControls.play();
        }
      }
    },
    handleEditLine: async (lineIndex) => {
      const { playerControls } = usePlayerSetupStore.getState();
      if (!playerControls) {
        console.warn("[handleEditLine] Aborted: playerControls not available.");
        return;
      }

      const actions = useKaraokeStore.getState().actions;
      const { success, preRollTime } = await actions.startEditLine(lineIndex);

      if (success) {
        useKaraokeStore.getState().actions.setIsPlaying(true);
        playerControls.seek(preRollTime);
        playerControls.play();
      }
    },
    handleRetiming: (lineIndex: number) => {
      const { playerControls } = usePlayerSetupStore.getState();
      if (!playerControls) {
        console.warn("[handleRetiming] Aborted: playerControls not available.");
        return;
      }

      const actions = useKaraokeStore.getState().actions;
      const { success, preRollTime } = actions.startTimingFromLine(lineIndex);

      if (success) {
        playerControls.seek(preRollTime);
        if (!playerControls.isPlaying()) {
          playerControls.play();
        }
      }
    },
  })
);
