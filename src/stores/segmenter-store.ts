import { useKaraokeStore } from "@/pages/update/store/useKaraokeStore";
import { useEffect } from "react";

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
  } = useKaraokeStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if an input is focused or a modal is open
      if (
        ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) ||
        isEditModalOpen ||
        !player
      )
        return;

      const totalLines = lyricsData.length
        ? Math.max(...lyricsData.map((w) => w.lineIndex)) + 1
        : 0;

      // --- Mode Switching ---
      if (e.ctrlKey && e.code === "Enter") {
        e.preventDefault();
        return;
      }

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

      // Open text edit modal with Shift + Enter
      if (e.shiftKey && e.code === "Enter" && selectedLineIndex !== null) {
        e.preventDefault();
        actions.openEditModal();
        return;
      }

      // Start line timing with Enter
      if (e.code === "Enter" && selectedLineIndex !== null) {
        e.preventDefault();
        onEditLine(selectedLineIndex); // Use the passed handler
        return;
      }

      // Play/Pause with Space
      if (e.code === "Space") {
        e.preventDefault();
        if (player.isPlaying()) {
          player.pause();
        } else {
          // If a line is selected, start playback from its beginning for context
          if (selectedLineIndex !== null) {
            const firstWord = lyricsData.find(
              (w) => w.lineIndex === selectedLineIndex
            );
            // Seek to the start of the line, or 0 if not timed yet
            const startTime = firstWord?.start ?? 0;
            player.seek(startTime);
          }
          player.play();
        }
        return;
      }

      // Correction with ArrowLeft
      if (
        (isTimingActive || correctionIndex !== null) &&
        e.code === "ArrowLeft"
      ) {
        e.preventDefault();
        if (currentIndex <= 0) return;
        const prevIndex = currentIndex - 1;
        // The action now correctly seeks to the start of the target line
        const { lineStartTime } = actions.correctTimingStep(prevIndex);
        player.seek(lineStartTime);
        if (!player.isPlaying()) player.play();
        return;
      }

      // Timing trigger with ArrowRight
      if (player.isPlaying() && e.code === "ArrowRight") {
        // Allow timing only if in Edit Mode OR if a line timing has been explicitly started
        if (isTimingActive) {
          e.preventDefault();
          const currentTime = player.getCurrentTime();

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
            // The logic to stop or continue is now handled within the store
            // based on isEditMode.
            alert(
              `Line ${lyricsData[currentIndex].lineIndex + 1} timing complete!`
            );
            // The store will auto-pause if not in global edit mode.
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
  ]);
};
