import { create } from "zustand";
import { calculateSeekTime } from "@/modules/lyrics-editor";
import { useSettingsStore } from "@/features/settings/settings-store";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { useTimerStore } from "@/timer-worker/store";
import { usePlayerSetupStore } from "./usePlayerSetup";

/**
 * Back the start position up by the configured lead-in.
 *
 * The caller's position is in the mode's own unit — ticks for MIDI, seconds for
 * everything else — so the seconds from settings are converted before they are
 * subtracted. Mixing the two is what makes a playhead land in the wrong bar.
 */
function applyPreRoll(position: number): number {
  const seconds = useSettingsStore.getState().preRollSeconds;
  if (seconds <= 0) return position;

  const { mode, playerState } = useKaraokeStore.getState();
  if (mode !== "midi") return Math.max(0, position - seconds);

  const ppq = playerState.midi?.ticksPerBeat ?? 480;
  const currentTempo = useTimerStore.getState().displayBpm;
  const bpm = currentTempo > 0 ? currentTempo : 120;
  const ticks = seconds * ((ppq * bpm) / 60);
  return Math.max(0, position - ticks);
}

interface PlayerHandlersState {
  handleStop: () => void;
  handleWordClick: (index: number) => void;
  handleRetiming: (lineIndex: number, endLineIndex?: number) => void;
}

export const usePlayerHandlersStore = create<PlayerHandlersState>(
  () => {
    let navigationRequest = 0;

    return {
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
        const request = ++navigationRequest;
        const { lyricsData } = useKaraokeStore.getState();
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

        const seekTo = calculateSeekTime(word, flatLyrics);

        useKaraokeStore.getState().actions.setIsChordPanelAutoScrolling(true);
        useKaraokeStore.getState().actions.selectLine(word.lineIndex);
        await useKaraokeStore.getState().actions.stopTiming();
        if (request !== navigationRequest) return;
        const wasPlaying = playerControls.isPlaying();
        await Promise.resolve(playerControls.seek(seekTo));
        if (request !== navigationRequest) return;

        if (!wasPlaying && !playerControls.isPlaying()) {
          playerControls.play();
        }
      },
      handleRetiming: async (lineIndex: number, endLineIndex?: number) => {
        const request = ++navigationRequest;
        const { playerControls } = usePlayerSetupStore.getState();
        if (!playerControls) {
          console.warn("[handleRetiming] Aborted: playerControls not available.");
          return;
        }

        const actions = useKaraokeStore.getState().actions;
        const { success, preRollTime } = actions.startTimingFromLine(
          lineIndex,
          endLineIndex
        );

        if (success) {
          const wasPlaying = playerControls.isPlaying();
          await Promise.resolve(playerControls.seek(applyPreRoll(preRollTime)));
          if (request !== navigationRequest) return;
          if (!wasPlaying && !playerControls.isPlaying()) {
            playerControls.play();
          }
        }
      },
    };
  }
);
