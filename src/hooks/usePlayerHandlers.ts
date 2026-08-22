import { create } from "zustand";
import { calculateSeekTime } from "@/modules/lyrics-editor";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { transport } from "@/lib/karaoke-engine/transport";
import { usePlayerSetupStore } from "./usePlayerSetup";
import { useTimerStore } from "@/timer-worker/store";
import { requestLyricsGridCenterActiveWord } from "@/components/lyrics/lyrics-preview-sync";

interface PlayerHandlersState {
  handleStop: () => void;
  handleWordClick: (index: number) => void;
  handleRetiming: (lineIndex: number, endLineIndex?: number) => void;
  handleRetimingLines: (lineIndices: number[]) => void;
  handleRetimingAll: () => void;
  handleTimingForward: () => Promise<void>;
  handleCancelRetiming: () => void;
}

export const usePlayerHandlersStore = create<PlayerHandlersState>(
  () => {
    let navigationRequest = 0;
    let timingStepInFlight = false;

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

    const handleTimingForward = async () => {
      if (timingStepInFlight) return;

      const { playerControls } = usePlayerSetupStore.getState();
      const initialState = useKaraokeStore.getState();
      const isStampingMode =
        initialState.isTimingActive || initialState.editingLineIndex !== null;
      if (!playerControls || !isStampingMode || !playerControls.isPlaying()) {
        return;
      }

      timingStepInFlight = true;
      try {
        const timer = useTimerStore.getState();
        const currentTime = timer.worker
          ? (await timer.getCurrentTiming()).presentationValue
          : playerControls.getCurrentTime();
        const state = useKaraokeStore.getState();
        const { actions } = state;

        if (!state.isTimingActive && state.editingLineIndex === null) return;

        if (state.isTimingActive) {
          const { isLineEnd } = actions.recordTiming(currentTime);
          if (isLineEnd) {
            playerControls.pause();
            const nextGroup = actions.finishTimingGroup();
            if (nextGroup.done) {
              await actions.stopTiming();
            } else {
              // Move to the next disconnected group with the same pre-roll
              // behavior as the keyboard workflow.
              const seek = playerControls.seek(nextGroup.preRollTime);
              playerControls.play();
              await Promise.resolve(seek);
            }
          } else {
            actions.goToNextWord();
          }
        } else {
          actions.startTiming(currentTime);

          // The first tap stamps the first word, then advances to the next
          // word so the grid can center the next target immediately.
          const timingState = useKaraokeStore.getState();
          const flatLyrics = timingState.lyricsData.flat();
          const timingIndex = timingState.currentIndex;
          const nextWord = flatLyrics[timingIndex + 1];
          const canAdvanceWithinEdit =
            nextWord &&
            (timingState.editingEndLineIndex === null ||
              nextWord.lineIndex <= timingState.editingEndLineIndex);
          if (canAdvanceWithinEdit) actions.goToNextWord();
        }

        if (useKaraokeStore.getState().editingLineIndex !== null) {
          // The canvas owns its horizontal offset outside React. Recalculate
          // it after the timing transaction so touch and keyboard input land
          // on the same visual frame.
          requestLyricsGridCenterActiveWord();
        }
      } finally {
        timingStepInFlight = false;
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

        useKaraokeStore.getState().actions.setPlayFromScrolledPosition(false);
        useKaraokeStore.getState().actions.setIsChordPanelAutoScrolling(true);
        useKaraokeStore.getState().actions.selectLine(word.lineIndex);
        const wasPlaying = playerControls.isPlaying();
        const stopTiming = useKaraokeStore.getState().actions.stopTiming();
        useKaraokeStore
          .getState()
          .actions.setPlaybackVisualOverride({
            index,
            // Keep the clicked box selected while the exact target waits for
            // the engine's future audio boundary.
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
          await Promise.resolve(playerControls.seek(targetTime));
          return;
        }

        // MIDI must receive the user's activation before an async stop/seek
        // continuation. Otherwise the first click can start the timer after
        // the browser has suspended AudioContext, leaving a silent playhead.
        if (mode === "midi" && !wasPlaying) {
          // A stopped MIDI seek is synchronous at the transport level. Arm
          // the exact lyric timestamp before starting; the engine's future
          // boundary provides buffer lead without replaying earlier notes.
          const seek = playerControls.seek(targetTime);
          playerControls.play();
          await Promise.resolve(stopTiming);
          await Promise.resolve(seek);
        } else {
          await Promise.resolve(stopTiming);
          if (request !== navigationRequest) return;
          await Promise.resolve(playerControls.seek(targetTime));
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
      handleRetimingAll: () =>
        handleRetimingLines(
          useKaraokeStore
            .getState()
            .lyricsData.map((_, lineIndex) => lineIndex)
        ),
      handleTimingForward,
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
