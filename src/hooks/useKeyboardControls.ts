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
  const playFromScrolledPosition = useKaraokeStore(
    (state) => state.playFromScrolledPosition
  );
  const chordPanelCenterTick = useKaraokeStore(
    (state) => state.chordPanelCenterTick
  );
  const isPlaying = useKaraokeStore((state) => state.isPlaying);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) ||
        isEditModalOpen ||
        !player
      )
        return;

      const isStampingMode = isTimingActive || editingLineIndex !== null;
      const flatLyrics = lyricsData.flat();

      if (e.ctrlKey && e.code === "KeyZ") {
        e.preventDefault();
        actions.undo();
        return;
      }
      if (e.ctrlKey && e.code === "KeyY") {
        e.preventDefault();
        actions.redo();
        return;
      }

      const totalLines = lyricsData.length;

      if (!isStampingMode) {
        if (e.code === "ArrowUp") {
          e.preventDefault();
          actions.selectLine(
            selectedLineIndex === null
              ? totalLines > 0
                ? 0
                : null
              : Math.max(0, selectedLineIndex - 1)
          );
          actions.setPlayFromScrolledPosition(false);
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
          actions.setPlayFromScrolledPosition(false);
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
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (isStampingMode) return;

        if (isPlaying) {
          player.pause();
        } else {
          let seekTime = chordPanelCenterTick;

          if (selectedLineIndex !== null && lyricsData[selectedLineIndex]) {
            const firstWordOfLine = lyricsData[selectedLineIndex][0];

            if (firstWordOfLine && firstWordOfLine.start !== null) {
              seekTime = firstWordOfLine.start;
            }
          }

          actions.setIsChordPanelAutoScrolling(true);
          actions.setCurrentTime(seekTime);
          player.seek(seekTime);
          player.play();
        }
        return;
      }

      if (isStampingMode && e.code === "ArrowLeft") {
        e.preventDefault();
        if (currentIndex <= -1) return;

        if (editingLineIndex !== null) {
          const firstWordOfEditingLine = flatLyrics.find(
            (w) => w.lineIndex === editingLineIndex
          );
          if (
            firstWordOfEditingLine &&
            currentIndex === firstWordOfEditingLine.index
          ) {
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

        const currentWord = currentIndex > -1 ? flatLyrics[currentIndex] : null;
        const canPerformTimingAction =
          isStampingMode ||
          (editingLineIndex === null &&
            currentWord &&
            currentWord.start === null);

        if (canPerformTimingAction) {
          if (isTimingActive) {
            const { isLineEnd } = actions.recordTiming(currentTime);
            if (currentIndex + 1 >= flatLyrics.length) {
              alert("All timing complete!");
              player.pause();
              actions.stopTiming();
            } else if (!isLineEnd) {
              actions.goToNextWord();
            }
          } else {
            actions.startTiming(currentTime);
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
    playFromScrolledPosition,
    chordPanelCenterTick,
    isPlaying,
  ]);
};
