"use client";

import { useEffect } from "react";
import { create } from "zustand";

import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import { usePlayerSetupStore } from "@/hooks/usePlayerSetup";
import { calculateSeekTime } from "@/modules/lyrics-editor";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { useTimerStore } from "@/timer-worker/store";

/**
 * Editor keyboard service.
 *
 * The listener is attached exactly once for the lifetime of the page and reads
 * everything it needs through `getState()` at the moment a key is pressed. The
 * previous hook re-registered its listener whenever any of a dozen subscribed
 * values changed — which happens constantly while the transport is running — so
 * a keypress that landed between the removeEventListener and the matching
 * addEventListener was simply lost. That is why Space felt dead at random.
 *
 * Space is handled on keyup, like karaoke-web-online does: keydown only
 * suppresses the browser's page-scroll and the focused control's own activation,
 * so holding the key cannot retrigger the transport.
 */

interface KeyboardServiceState {
  /** Set while a modal owns the keyboard; shortcuts stay inert. */
  paused: boolean;
  setPaused: (paused: boolean) => void;
  initialize: () => void;
}

/** Keys the editor claims. Everything else is left to the browser. */
const OWNED_CODES = new Set([
  "Space",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Enter",
  "Escape",
]);

const SHIFT_CODES = new Set(["ShiftLeft", "ShiftRight"]);

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return (
    element.isContentEditable === true ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)
  );
}

/** A dialog on screen owns the keyboard until it closes. */
function isDialogOpen(): boolean {
  return !!document.querySelector(
    '[role="dialog"]:not([data-closed]), [data-slot="dialog-content"]:not([data-closed])'
  );
}

export const useKeyboardService = create<KeyboardServiceState>((set, get) => {
  let initialized = false;

  const blocked = (event: KeyboardEvent): boolean =>
    get().paused || isTypingTarget(event.target) || isDialogOpen();

  const handleKeyDown = (event: KeyboardEvent) => {
    if (blocked(event)) return;
    if (SHIFT_CODES.has(event.code)) {
      const state = useKaraokeStore.getState();
      if (state.lineSelectionMode && state.lineSelectionAnchor !== null) {
        event.preventDefault();
        state.actions.setLineShiftArmed(true);
      }
      return;
    }
    if (event.code === "Escape") {
      const state = useKaraokeStore.getState();
      if (
        state.lineSelectionMode ||
        state.isTimingActive ||
        state.editingLineIndex !== null
      ) {
        event.preventDefault();
      }
      return;
    }
    if (!OWNED_CODES.has(event.code)) return;
    // Claim the key now so the page cannot scroll and a focused button cannot
    // activate; the actual work happens on keyup.
    event.preventDefault();
  };

  const handleKeyUp = async (event: KeyboardEvent) => {
    if (SHIFT_CODES.has(event.code)) {
      const state = useKaraokeStore.getState();
      if (state.lineShiftArmed) state.actions.setLineShiftArmed(false);
      return;
    }

    if (blocked(event)) return;

    if (event.code === "Escape") {
      const state = useKaraokeStore.getState();
      if (state.isTimingActive || state.editingLineIndex !== null) {
        // Use the same session-level cancellation as the button so playback
        // is stopped and the original timestamps are restored atomically.
        void usePlayerHandlersStore.getState().handleCancelRetiming();
      } else if (state.lineSelectionMode) {
        state.actions.setLineSelectionMode(false);
      }
      return;
    }

    const store = useKaraokeStore.getState();
    const { playerControls: player } = usePlayerSetupStore.getState();
    const { handleRetiming } = usePlayerHandlersStore.getState();
    if (!player) return;

    const {
      actions,
      selectedLineIndex,
      lyricsData,
      isTimingActive,
      currentIndex,
      editingLineIndex,
      timingBuffer,
      editingEndLineIndex,
      isPlaying,
      playFromScrolledPosition,
    } = store;

    const isStampingMode = isTimingActive || editingLineIndex !== null;
    const flatLyrics = lyricsData.flat();
    const totalLines = lyricsData.length;

    if (event.ctrlKey && event.code === "KeyZ") return actions.undo();
    if (event.ctrlKey && event.code === "KeyY") return actions.redo();

    if (!isStampingMode) {
      if (event.code === "ArrowUp" || event.code === "ArrowDown") {
        const step = event.code === "ArrowUp" ? -1 : 1;
        const next =
          selectedLineIndex === null
            ? totalLines > 0
              ? 0
              : null
            : Math.min(
                totalLines - 1,
                Math.max(0, selectedLineIndex + step)
              );
        if (next !== null) actions.selectLine(next);
        actions.setPlayFromScrolledPosition(false);
        return;
      }

      if (event.code === "Enter" && selectedLineIndex !== null) {
        if (event.ctrlKey) handleRetiming(selectedLineIndex, selectedLineIndex);
        else actions.openEditModal();
        return;
      }
    }

    if (event.code === "Space") {
      if (isStampingMode) return;

      if (isPlaying || player.isPlaying()) {
        player.pause();
        // A pause is a visual reset, not a resume point. The next Space will
        // start from box 1 of the currently selected line.
        actions.setPlaybackIndex(null);
        actions.setPlaybackVisualOverride(null);
        return;
      }

      // A chord-ruler/notes click is an explicit playback target. Do not let
      // the lyrics line selection overwrite it when Space starts playback.
      if (playFromScrolledPosition) {
        actions.setPlaybackVisualOverride(null);
        player.play();
        return;
      }

      // In lyrics mode Space starts at box 1 of the selected line.
      const firstWord =
        selectedLineIndex === null
          ? undefined
          : lyricsData[selectedLineIndex]?.[0];
      if (firstWord) {
        const targetTime = calculateSeekTime(firstWord, flatLyrics);
        actions.setPlayFromScrolledPosition(false);
        actions.setIsChordPanelAutoScrolling(true);
        actions.setCurrentTime(targetTime);
        actions.setCurrentIndex(firstWord.index);
        actions.setPlaybackIndex(firstWord.index);
        actions.setPlaybackVisualOverride({
          index: firstWord.index,
          // Keep the selected box stable while the exact target waits for the
          // engine's future audio boundary.
          until: targetTime,
        });
        // Seek to the exact line timestamp. The MIDI transport schedules a
        // future boundary for its buffer, so no earlier lyric/audio is used as
        // a synthetic lead-in.
        const seek = player.seek(targetTime);
        player.play();
        await Promise.resolve(seek);
        return;
      }

      player.play();
      return;
    }

    if (isStampingMode && event.code === "ArrowLeft") {
      if (currentIndex <= -1) return;

      if (editingLineIndex !== null) {
        const firstWord = flatLyrics.find(
          (word) => word.lineIndex === editingLineIndex
        );
        if (firstWord && currentIndex === firstWord.index) return;
      } else if (isTimingActive && timingBuffer) {
        const firstWord = flatLyrics.find(
          (word) => word.lineIndex === timingBuffer.lineIndex
        );
        if (firstWord && currentIndex <= firstWord.index) return;
      }

      const { lineStartTime } = actions.correctTimingStep(currentIndex - 1);
      player.seek(lineStartTime);
      if (!player.isPlaying()) player.play();
      return;
    }

    if (player.isPlaying() && event.code === "ArrowRight") {
      const timer = useTimerStore.getState();
      const currentTime = timer.worker
        ? (await timer.getCurrentTiming()).presentationValue
        : player.getCurrentTime();

      const currentWord = currentIndex > -1 ? flatLyrics[currentIndex] : null;
      const canRecord =
        isStampingMode ||
        (editingLineIndex === null && currentWord && currentWord.at === null);
      if (!canRecord) return;

      if (isTimingActive) {
        const { isLineEnd } = actions.recordTiming(currentTime);
        if (isLineEnd) {
          player.pause();
          const nextGroup = actions.finishTimingGroup();
          if (nextGroup.done) {
            await actions.stopTiming();
          } else {
            // The current group is complete, but the session is not. Seek to
            // the line before the next group so every disconnected group gets
            // its own audible preparation line.
            const seek = player.seek(nextGroup.preRollTime);
            player.play();
            await Promise.resolve(seek);
          }
        } else {
          actions.goToNextWord();
        }
      } else {
        actions.startTiming(currentTime);

        // There is no preselected box when retiming starts. The first
        // right-arrow stamps box 0, then advances so the orange state means
        // "the next box to stamp".
        const timingIndex = useKaraokeStore.getState().currentIndex;
        const nextWord = flatLyrics[timingIndex + 1];
        const canAdvanceWithinEdit =
          nextWord &&
          (editingEndLineIndex === null ||
            nextWord.lineIndex <= editingEndLineIndex);
        if (canAdvanceWithinEdit) actions.goToNextWord();
      }
    }
  };

  return {
    paused: false,
    setPaused: (paused) => set({ paused }),

    initialize: () => {
      if (initialized || typeof window === "undefined") return;
      initialized = true;
      // Capture phase so a focused base-ui control cannot swallow the event.
      window.addEventListener("keydown", handleKeyDown, true);
      window.addEventListener("keyup", handleKeyUp, true);
    },
  };
});

/** Mount once, near the root of the editor. */
export const useKeyboardListener = () => {
  const initialize = useKeyboardService((state) => state.initialize);
  useEffect(() => {
    initialize();
  }, [initialize]);
};
