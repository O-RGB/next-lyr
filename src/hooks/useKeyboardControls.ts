import { useEffect } from "react";
import { useKaraokeStore } from "../stores/karaoke-store";

export type PlayerControls = {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
};

export const useKeyboardControls = (
  player: PlayerControls | null,
  onEditLine: (lineIndex: number) => void
) => {
  const actions = useKaraokeStore((state) => state.actions);
  const isEditModalOpen = useKaraokeStore((state) => state.isEditModalOpen);
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex);
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const isTimingActive = useKaraokeStore((state) => state.isTimingActive);
  const correctionIndex = useKaraokeStore((state) => state.correctionIndex);
  const currentIndex = useKaraokeStore((state) => state.currentIndex);
  const editingLineIndex = useKaraokeStore((state) => state.editingLineIndex);
  const midiInfo = useKaraokeStore((state) => state.midiInfo);

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

      if (e.code === "Enter" && !e.ctrlKey && selectedLineIndex !== null) {
        e.preventDefault();
        actions.openEditModal();
        return;
      }

      if (e.ctrlKey && e.code === "Enter" && selectedLineIndex !== null) {
        e.preventDefault();
        onEditLine(selectedLineIndex);
        return;
      }

      if (e.code === "Space" && midiInfo) {
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

      if (
        (isTimingActive || editingLineIndex !== null) &&
        e.code === "ArrowLeft"
      ) {
        e.preventDefault();
        if (currentIndex <= 0) return;

        if (editingLineIndex !== null) {
          const firstWordOfEditingLine = lyricsData.find(
            (w) => w.lineIndex === editingLineIndex
          );
          if (
            firstWordOfEditingLine &&
            currentIndex === firstWordOfEditingLine.index
          ) {
            onEditLine(editingLineIndex);
            return;
          }
        }

        const prevIndex = currentIndex - 1;
        const { lineStartTime } = actions.correctTimingStep(prevIndex);
        player.seek(lineStartTime);
        if (!player.isPlaying()) player.play();
        return;
      }

      if (player.isPlaying() && e.code === "ArrowRight") {
        e.preventDefault();

        const currentTime = player.getCurrentTime();
        const currentWord = lyricsData[currentIndex];

        const isStartingFromScratch =
          !isTimingActive &&
          editingLineIndex === null &&
          currentWord &&
          currentWord.start === null;

        const isStartingEditedLine =
          !isTimingActive && editingLineIndex !== null;

        if (isTimingActive || isStartingFromScratch || isStartingEditedLine) {
          if (isStartingFromScratch) {
            actions.startTiming(currentTime);
            return;
          }

          if (isStartingEditedLine) {
            actions.startTiming(currentTime);
            return;
          }

          const { isLineEnd } = actions.recordTiming(currentTime);

          if (currentIndex + 1 >= lyricsData.length) {
            alert("All timing complete!");
            player.pause();
            actions.stopTiming();
          } else if (isLineEnd) {
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
