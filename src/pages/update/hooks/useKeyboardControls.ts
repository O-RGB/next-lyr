import { useEffect } from "react";
import { useKaraokeStore } from "../store/useKaraokeStore";

// A helper type for player controls
type PlayerControls = {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
};

// This hook now encapsulates all keyboard-related logic
export const useKeyboardControls = (player: PlayerControls | null) => {
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
      if (
        ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) ||
        isEditModalOpen ||
        !player
      )
        return;

      const totalLines = lyricsData.length
        ? Math.max(...lyricsData.map((w) => w.lineIndex)) + 1
        : 0;

      // Arrow navigation for line selection
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
      // Open edit modal
      if (e.code === "Enter" && selectedLineIndex !== null) {
        e.preventDefault();
        actions.openEditModal();
        return;
      }

      // Play/Pause
      if (e.code === "Space") {
        e.preventDefault();
        if (player.isPlaying()) {
          player.pause();
        } else {
          if (selectedLineIndex !== null) {
            const firstWord = lyricsData.find(
              (w) => w.lineIndex === selectedLineIndex
            );
            const preRollTime = firstWord?.start ?? 0;
            player.seek(preRollTime);
          }
          player.play();
        }
        return;
      }

      // Go back / Correction
      if (
        (isTimingActive || correctionIndex !== null) &&
        e.code === "ArrowLeft"
      ) {
        e.preventDefault();
        if (currentIndex <= 0) return;
        const prevIndex = currentIndex - 1;
        const { lineStartTime } = actions.correctTimingStep(prevIndex);
        player.seek(lineStartTime);
        if (!player.isPlaying()) player.play();
        return;
      }

      // Timing trigger
      if (player.isPlaying() && e.code === "ArrowRight") {
        e.preventDefault();
        const currentTime = player.getCurrentTime();

        if (!isTimingActive) {
          actions.startTiming(currentTime);
          return;
        }

        const { isLineEnd } = actions.recordTiming(currentTime);

        if (currentIndex + 1 >= lyricsData.length || isLineEnd) {
          alert(
            isLineEnd
              ? `Line ${
                  lyricsData[currentIndex].lineIndex + 1
                } timing complete!`
              : "All timing complete!"
          );
          player.pause();
          actions.stopTiming();
        } else {
          actions.goToNextWord();
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
  ]);
};
