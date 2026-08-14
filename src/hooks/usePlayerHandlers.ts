import { create } from "zustand";
import {
  calculatePlaybackSeekTime,
  calculateSeekTime,
} from "@/modules/lyrics-editor";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { midiSynths } from "@/lib/karaoke-engine/midi-synth";
import { transport } from "@/lib/karaoke-engine/transport";
import { usePlayerSetupStore } from "./usePlayerSetup";

interface PlayerHandlersState {
  handleStop: () => void;
  handleWordClick: (index: number) => void;
  handleRetiming: (lineIndex: number, endLineIndex?: number) => void;
  handleRetimingLines: (lineIndices: number[]) => void;
  handleCancelRetiming: () => void;
}

export const usePlayerHandlersStore = create<PlayerHandlersState>(
  () => {
    let navigationRequest = 0;

    const handleRetimingLines = async (lineIndices: number[]) => {
      const request = ++navigationRequest;
      const { playerControls } = usePlayerSetupStore.getState();
      if (transport.loading) return;
      if (!playerControls) {
        console.warn("[handleRetimingLines] Aborted: playerControls not available.");
        return;
      }

      const actions = useKaraokeStore.getState().actions;
      const mode = useKaraokeStore.getState().mode;
      const { success, preRollTime } = actions.startTimingFromLines(lineIndices);

      if (!success) return;

      const wasPlaying = playerControls.isPlaying();
      const seek = playerControls.seek(preRollTime);
      if (mode === "midi" && !wasPlaying) {
        // Keep the first retiming click inside the same user gesture too.
        playerControls.play();
      }
      await Promise.resolve(seek);
      if (request !== navigationRequest) return;
      if (!wasPlaying && !playerControls.isPlaying()) {
        playerControls.play();
      }
    };

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

        if (transport.loading) return;

        const flatLyrics = lyricsData.flat();
        const word = flatLyrics.find((w) => w.index === index);

        if (!word || !playerControls) {
          console.warn(
            "[handleWordClick] Aborted: Word data or playerControls not available.",
            { word, playerControls }
          );
          return;
        }

        const targetTime = calculateSeekTime(word, flatLyrics);
        const mode = useKaraokeStore.getState().mode;
        const midi = useKaraokeStore.getState().playerState.midi;
        const seekTo = calculatePlaybackSeekTime(
          targetTime,
          mode,
          midi,
          mode === "midi" ? midiSynths.playbackStartLeadSeconds : undefined
        );

        useKaraokeStore.getState().actions.setIsChordPanelAutoScrolling(true);
        useKaraokeStore.getState().actions.selectLine(word.lineIndex);
        const wasPlaying = playerControls.isPlaying();
        const stopTiming = useKaraokeStore.getState().actions.stopTiming();
        useKaraokeStore
          .getState()
          .actions.setPlaybackVisualOverride({
            index,
            // The transport leads in, but the visual must not activate until
            // the clicked lyric's original timestamp.
            until: targetTime,
          });
        useKaraokeStore.getState().actions.setPlaybackIndex(index);

        // A mouse click is an explicit navigation command even during
        // playback. The active transport seek re-arms the same player and
        // keeps it playing at the clicked word; it must not fall through to
        // the stopped-player start path below.
        if (wasPlaying) {
          await Promise.resolve(stopTiming);
          if (request !== navigationRequest) return;
          await Promise.resolve(playerControls.seek(seekTo));
          return;
        }

        // MIDI must receive the user's activation before an async stop/seek
        // continuation. Otherwise the first click can start the timer after
        // the browser has suspended AudioContext, leaving a silent playhead.
        if (mode === "midi" && !wasPlaying) {
          const seek = playerControls.seek(seekTo);
          playerControls.play();
          await Promise.resolve(stopTiming);
          await Promise.resolve(seek);
        } else {
          await Promise.resolve(stopTiming);
          if (request !== navigationRequest) return;
          await Promise.resolve(playerControls.seek(seekTo));
        }

        if (request !== navigationRequest) return;

        if (!wasPlaying && !playerControls.isPlaying()) {
          playerControls.play();
        }
      },
      handleRetiming: (lineIndex: number, endLineIndex?: number) =>
        handleRetimingLines(
          Array.from(
            { length: Math.max(0, (endLineIndex ?? lineIndex) - lineIndex + 1) },
            (_, index) => lineIndex + index
          )
        ),
      handleRetimingLines,
      handleCancelRetiming: async () => {
        ++navigationRequest;
        const { playerControls } = usePlayerSetupStore.getState();

        // Pause after playback has started. While the engine is still loading,
        // pause is a no-op, so stop the shared transport to invalidate its
        // pending start operation.
        playerControls?.pause();
        if (transport.loading) transport.stop();

        await useKaraokeStore.getState().actions.cancelTiming();
        useKaraokeStore.getState().actions.setIsPlaying(false);
        useKaraokeStore.getState().actions.setPlaybackIndex(null);
        useKaraokeStore.getState().actions.setPlaybackVisualOverride(null);
      },
    };
  }
);
