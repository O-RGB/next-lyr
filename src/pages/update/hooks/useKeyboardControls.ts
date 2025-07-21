import { useEffect } from "react";
import { useKaraokeStore } from "../store/useKaraokeStore";

// A helper type for player controls
export type PlayerControls = {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
};

// This hook now encapsulates all keyboard-related logic
export const useKeyboardControls = (
  player: PlayerControls | null,
  onEditLine: (lineIndex: number) => void // Pass the handler from the main component
) => {
  const {
    actions,
    isEditModalOpen,
    selectedLineIndex,
    lyricsData,
    isTimingActive,
    correctionIndex,
    currentIndex,
    editingLineIndex,
  } = useKaraokeStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) ||
        isEditModalOpen ||
        !player
      )
        return;

      const totalLines = lyricsData.length
        ? Math.max(...lyricsData.map((w) => w.lineIndex)) + 1
        : 0;

      // --- Navigation ---
      if (e.code === "ArrowUp") {
        e.preventDefault();
        actions.selectLine(
          selectedLineIndex === null
            ? totalLines > 0
              ? 0
              : null
            : Math.max(0, selectedLineIndex - 1)
        );
        return;
      }
      if (e.code === "ArrowDown") {
        e.preventDefault();
        actions.selectLine(
          selectedLineIndex === null
            ? totalLines > 0
              ? 0
              : null
            : Math.min(totalLines - 1, selectedLineIndex + 1)
        );
        return;
      }

      // --- Editing & Timing ---

      // Open text edit modal with Enter
      if (e.code === "Enter" && !e.ctrlKey && selectedLineIndex !== null) {
        e.preventDefault();
        actions.openEditModal();
        return;
      }

      // Start line re-timing with Control + Enter
      if (e.ctrlKey && e.code === "Enter" && selectedLineIndex !== null) {
        e.preventDefault();
        onEditLine(selectedLineIndex);
        return;
      }

      // --- Playback ---
      if (e.code === "Space") {
        e.preventDefault();
        if (player.isPlaying()) {
          player.pause();
        } else {
          if (selectedLineIndex !== null) {
            const firstWord = lyricsData.find(
              (w) => w.lineIndex === selectedLineIndex
            );
            const startTime = firstWord?.start ?? 0;
            player.seek(startTime);
          }
          player.play();
        }
        return;
      }

      // --- CORRECTION LOGIC FIX ---
      if (
        (isTimingActive || editingLineIndex !== null) &&
        e.code === "ArrowLeft"
      ) {
        e.preventDefault();
        if (currentIndex <= 0) return;

        // *** BUG FIX APPLIED HERE ***
        // If we are in single-line edit mode and at the first word,
        // pressing 'left' will reset the timing state for that line.
        if (editingLineIndex !== null) {
          const firstWordOfEditingLine = lyricsData.find(
            (w) => w.lineIndex === editingLineIndex
          );
          if (
            firstWordOfEditingLine &&
            currentIndex === firstWordOfEditingLine.index
          ) {
            // This resets the line to its "ready-to-time" state.
            onEditLine(editingLineIndex);
            return;
          }
        }

        // Standard correction step for all other cases
        const prevIndex = currentIndex - 1;
        const { lineStartTime } = actions.correctTimingStep(prevIndex);
        player.seek(lineStartTime);
        if (!player.isPlaying()) player.play();
        return;
      }

      // --- TIMING RECORD LOGIC ---
      if (player.isPlaying() && e.code === "ArrowRight") {
        // Allow timing only if it has been explicitly started
        if (isTimingActive || editingLineIndex !== null) {
          e.preventDefault();
          const currentTime = player.getCurrentTime();

          // If timing isn't active yet (e.g., after starting a line edit), start it.
          // This ensures the first word gets timed correctly.
          if (!isTimingActive) {
            actions.startTiming(currentTime);
            return;
          }

          const { isLineEnd } = actions.recordTiming(currentTime);

          if (currentIndex + 1 >= lyricsData.length) {
            alert("All timing complete!");
            player.pause();
            actions.stopTiming();
          } else if (isLineEnd) {
            // Stop timing automatically when the edited line is finished.
            // The alert is now inside stopTiming action.
          } else {
            actions.goToNextWord();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    actions,
    isEditModalOpen,
    player,
    selectedLineIndex,
    lyricsData,
    isTimingActive,
    correctionIndex,
    currentIndex,
    onEditLine,
    editingLineIndex,
  ]);
};
