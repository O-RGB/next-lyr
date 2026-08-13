"use client";

import { useEffect } from "react";
import { create } from "zustand";

import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import { usePlayerSetupStore } from "@/hooks/usePlayerSetup";
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
]);

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

  /** Selection moved since playback last started: the next Space jumps to it. */
  let pendingLineJump = false;
  let lastSelectedLine: number | null = null;

  const blocked = (event: KeyboardEvent): boolean =>
    get().paused || isTypingTarget(event.target) || isDialogOpen();

  const handleKeyDown = (event: KeyboardEvent) => {
    if (blocked(event)) return;
    if (!OWNED_CODES.has(event.code)) return;
    // Claim the key now so the page cannot scroll and a focused button cannot
    // activate; the actual work happens on keyup.
    event.preventDefault();
  };

  const handleKeyUp = async (event: KeyboardEvent) => {
    if (blocked(event)) return;

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
      playFromScrolledPosition,
      chordPanelCenterTick,
      isPlaying,
    } = store;

    // Track selection changes here rather than in a React effect, so the
    // service stays independent of the render cycle.
    if (selectedLineIndex !== lastSelectedLine) {
      lastSelectedLine = selectedLineIndex;
      pendingLineJump = true;
    }

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
        return;
      }

      // Resuming holds its position; only an explicit jump repositions.
      if (playFromScrolledPosition) {
        actions.setPlayFromScrolledPosition(false);
        actions.setIsChordPanelAutoScrolling(true);
        actions.setCurrentTime(chordPanelCenterTick);
        player.seek(chordPanelCenterTick);
      } else if (pendingLineJump) {
        pendingLineJump = false;
        let seekTime = chordPanelCenterTick;
        if (selectedLineIndex !== null && lyricsData[selectedLineIndex]) {
          const firstWord = lyricsData[selectedLineIndex][0];
          if (firstWord && firstWord.start !== null) seekTime = firstWord.start;
        }
        actions.setIsChordPanelAutoScrolling(true);
        actions.setCurrentTime(seekTime);
        player.seek(seekTime);
      } else {
        actions.setIsChordPanelAutoScrolling(true);
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
        (editingLineIndex === null && currentWord && currentWord.start === null);
      if (!canRecord) return;

      if (isTimingActive) {
        const { isLineEnd } = actions.recordTiming(currentTime);
        if (isLineEnd) {
          player.pause();
          actions.stopTiming();
        } else {
          actions.goToNextWord();
        }
      } else {
        actions.startTiming(currentTime);
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
