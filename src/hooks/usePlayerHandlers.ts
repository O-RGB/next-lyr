import { create } from "zustand";
import { timingLyrics, nextTimingWord } from "@/stores/karaoke-store/timing-session";
import { calculateSeekTime } from "@/modules/lyrics-editor/timing";
import { hasCompleteLyricTiming } from "@/lib/karaoke/utils";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { transport } from "@/lib/karaoke-engine/transport";
import { usePlayerSetupStore } from "./usePlayerSetup";
import { useTimerStore } from "@/timer-worker/store";
import {
  requestLyricsGridCenterActiveWord,
  requestLyricsPreviewScroll,
} from "@/components/lyrics/lyrics-preview-sync";

interface PlayerHandlersState {
  handleStop: () => void;
  handlePlayPause: () => Promise<void>;
  handleContinueTiming: () => Promise<void>;
  handleResumeTiming: () => Promise<void>;
  handlePauseTiming: () => void;
  handleWordClick: (index: number) => void;
  handleRetiming: (lineIndex: number, endLineIndex?: number) => void;
  handleRetimingLines: (lineIndices: number[]) => void;
  handleRetimingAll: () => void;
  handleTimingForward: () => Promise<void>;
  handleTimingBackward: () => Promise<void>;
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
      const previousState = useKaraokeStore.getState();
      if (previousState.isTimingActive || previousState.editingLineIndex !== null) {
        void actions.stopTiming();
      }
      const { success, preRollTime } = actions.startTimingFromLines(lineIndices);

      if (!success) return;

      const wasPlaying = playerControls.isPlaying();
      const seek = playerControls.seek(preRollTime);
      if (mode === "midi" && !wasPlaying) {
        // Keep the first retiming click inside the same user gesture too.
        playerControls.play();
      }
      await Promise.resolve(seek);
      if (request !== navigationRequest || useKaraokeStore.getState().isEditModalOpen ||
        useKaraokeStore.getState().isAddModalOpen) return;
      if (!wasPlaying && !playerControls.isPlaying()) {
        playerControls.play();
      }
    };

    const handlePauseTiming = () => {
      ++navigationRequest;
      const { playerControls } = usePlayerSetupStore.getState();
      playerControls?.pause();
      if (transport.loading) transport.stop();
      const state = useKaraokeStore.getState();
      state.actions.setIsPlaying(false);
      state.actions.setPlaybackIndex(null);
      state.actions.setPlaybackVisualOverride(null);
      // The buffer and next target remain untouched while the user thinks or edits.
      if (state.isTimingActive || state.editingLineIndex !== null) {
        void state.actions.saveTimingDraft().catch((error) => console.error("Could not save timing progress:", error));
      }
    };

    const handleResumeTiming = async () => {
      ++navigationRequest;
      const { playerControls } = usePlayerSetupStore.getState();
      const state = useKaraokeStore.getState();
      if (!playerControls || state.isEditModalOpen || state.isAddModalOpen || transport.loading) return;
      if (!state.isTimingActive && state.editingLineIndex === null) return;
      const flat = timingLyrics(state).flat();
      let target = state.currentIndex < 0
        ? flat.find((word) => word.kind !== "image" && word.lineIndex >= (state.editingLineIndex ?? 0))
        : flat.find((word) => word.index === state.currentIndex);
      if (target && (target.kind === "image" || (state.timingOnlyUntimed &&
        (target.at !== null || state.timingBuffer?.buffer.get(target.index)?.at != null)))) {
        target = nextTimingWord({ ...state, currentIndex: target.index - 1 });
        if (target) state.actions.setCurrentIndex(target.index);
      }
      if (!target || (state.editingEndLineIndex !== null && target.lineIndex > state.editingEndLineIndex)) {
        const group = state.actions.finishTimingGroup();
        if (group.done) {
          await state.actions.stopTiming();
          return;
        }
        const seek = playerControls.seek(group.preRollTime);
        playerControls.play();
        await Promise.resolve(seek);
        return;
      }
      // Listen to the previous timed word again; never stamp it a second time.
      const previous = flat.slice(0, target.index).reverse().find((word) => word.kind !== "image" && word.at !== null);
      state.actions.selectLine(target.lineIndex);
      const seek = playerControls.seek(previous?.at ?? 0);
      playerControls.play();
      await Promise.resolve(seek);
      requestLyricsGridCenterActiveWord();
    };

    const handleContinueTiming = async () => {
      ++navigationRequest;
      const state = useKaraokeStore.getState();
      if (state.isTimingActive || state.editingLineIndex !== null) return handleResumeTiming();
      const { playerControls } = usePlayerSetupStore.getState();
      if (!playerControls || transport.loading) return;
      if (hasCompleteLyricTiming(state.lyricsData)) return;
      const firstUntimed = state.lyricsData.flat().find((word) => word.kind !== "image" && word.at === null);
      if (!firstUntimed) return;
      const result = state.actions.startTimingFromWord(firstUntimed.index);
      if (!result.success) return;
      const seek = playerControls.seek(result.preRollTime);
      playerControls.play();
      await Promise.resolve(seek);
    };

    const handlePlayPause = async () => {
      const state = useKaraokeStore.getState();
      const { playerControls: player } = usePlayerSetupStore.getState();
      if (!player) return;
      if (state.isTimingActive || state.editingLineIndex !== null) {
        if (state.isPlaying || player.isPlaying()) handlePauseTiming();
        else await handleResumeTiming();
        return;
      }
      if (state.isPlaying || player.isPlaying()) {
        player.pause();
        state.actions.setPlaybackIndex(null);
        state.actions.setPlaybackVisualOverride(null);
        return;
      }
      if (state.playFromScrolledPosition) {
        state.actions.setPlaybackVisualOverride(null);
        player.play();
        return;
      }
      const firstWord = state.selectedLineIndex === null ? undefined : state.lyricsData[state.selectedLineIndex]?.find(word => word.kind !== "image");
      if (firstWord) {
        const targetTime = calculateSeekTime(firstWord, state.lyricsData.flat());
        state.actions.setPlayFromScrolledPosition(false);
        state.actions.setIsChordPanelAutoScrolling(true);
        state.actions.setCurrentTime(targetTime);
        state.actions.setCurrentIndex(firstWord.index);
        state.actions.setPlaybackIndex(firstWord.index);
        state.actions.setPlaybackVisualOverride({ index: firstWord.index, until: targetTime });
        const seek = player.seek(targetTime);
        player.play();
        await Promise.resolve(seek);
      } else player.play();
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
      const request = navigationRequest;
      try {
        const timer = useTimerStore.getState();
        const currentTime = timer.worker
          ? (await timer.getCurrentTiming()).presentationValue
          : playerControls.getCurrentTime();
        const state = useKaraokeStore.getState();
        const { actions } = state;

        if (request !== navigationRequest) return;
        if ((!state.isTimingActive && state.editingLineIndex === null) ||
          state.isEditModalOpen || state.isAddModalOpen || !playerControls.isPlaying()) return;

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
          const nextWord = nextTimingWord(timingState);
          if (nextWord) {
            actions.goToNextWord();
          } else {
            playerControls.pause();
            const nextGroup = actions.finishTimingGroup();
            if (nextGroup.done) await actions.stopTiming();
            else {
              const seek = playerControls.seek(nextGroup.preRollTime);
              playerControls.play();
              await Promise.resolve(seek);
            }
          }
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

    const handleTimingBackward = async () => {
      if (timingStepInFlight) return;

      const { playerControls } = usePlayerSetupStore.getState();
      const state = useKaraokeStore.getState();
      const isStampingMode =
        state.isTimingActive || state.editingLineIndex !== null;
      if (!playerControls || !isStampingMode || state.currentIndex <= -1) {
        return;
      }

      timingStepInFlight = true;
      try {
        const flatLyrics = state.lyricsData.flat();
        const firstWordOfActiveLine =
          state.editingLineIndex !== null
            ? flatLyrics.find(
                (word) => word.kind !== "image" && word.lineIndex >= state.editingLineIndex! &&
                  (state.editingEndLineIndex === null || word.lineIndex <= state.editingEndLineIndex)
              )
            : state.timingBuffer
              ? flatLyrics.find(
                  (word) => word.kind !== "image" && word.lineIndex === state.timingBuffer!.lineIndex
                )
              : undefined;

        if (
          firstWordOfActiveLine &&
          state.currentIndex < firstWordOfActiveLine.index
        ) {
          return;
        }

        const lowerBound = firstWordOfActiveLine?.index ?? 0;
        const previousWord = flatLyrics.slice(0, state.currentIndex).reverse()
          .find(word => word.kind !== "image" && word.index >= lowerBound);
        const targetIndex = previousWord?.index ?? firstWordOfActiveLine?.index;
        if (targetIndex === undefined) return;
        const { lineStartTime } = state.actions.correctTimingStep(targetIndex);
        // Start playback inside the same user gesture before waiting for a
        // potentially asynchronous seek, especially for MIDI.
        const seek = playerControls.seek(lineStartTime);
        if (!playerControls.isPlaying()) playerControls.play();
        await Promise.resolve(seek);

        if (useKaraokeStore.getState().editingLineIndex !== null) {
          requestLyricsGridCenterActiveWord();
        }
      } finally {
        timingStepInFlight = false;
      }
    };

    return {
      handlePlayPause,
      handleContinueTiming,
      handleResumeTiming,
      handlePauseTiming,
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
        const state = useKaraokeStore.getState();
        const { lyricsData } = state;
        if (state.isTimingActive || state.editingLineIndex !== null) return;

        if (transport.loading) return;

        const flatLyrics = lyricsData.flat();
        const word = flatLyrics.find((w) => w.index === index);

        if (!word) {
          console.warn("[handleWordClick] Aborted: Word data not available.", {
            index,
          });
          return;
        }

        // Untimed boxes are selectable lyric content, not playback targets.
        // Keep the click local so an incomplete line cannot start the player
        // with a guessed seek position.
        if (word.kind === "image" || word.at === null) {
          useKaraokeStore.getState().actions.selectLine(word.lineIndex);
          return;
        }

        const { playerControls } = usePlayerSetupStore.getState();
        if (!playerControls) {
          console.warn(
            "[handleWordClick] Aborted: playerControls not available.",
            { word }
          );
          return;
        }

        const request = ++navigationRequest;
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
      handleRetimingAll: () => {
        requestLyricsPreviewScroll(0);
        return handleRetimingLines(
          useKaraokeStore
            .getState()
            .lyricsData.map((_, lineIndex) => lineIndex)
        );
      },
      handleTimingForward,
      handleTimingBackward,
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
