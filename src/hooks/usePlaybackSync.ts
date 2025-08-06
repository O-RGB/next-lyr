import { useEffect, RefObject } from "react";
import { useKaraokeStore } from "../stores/karaoke-store";
import { PlayerControls } from "./useKeyboardControls";

export const usePlaybackSync = (playerControls: PlayerControls | null) => {
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const isTimingActive = useKaraokeStore((state) => state.isTimingActive);
  const correctionIndex = useKaraokeStore((state) => state.correctionIndex);
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex);
  const editingLineIndex = useKaraokeStore((state) => state.editingLineIndex);
  const actions = useKaraokeStore((state) => state.actions);

  useEffect(() => {
    if (!playerControls) return;

    const syncLogic = (currentTime: number) => {
      if (isTimingActive && correctionIndex === null) {
        actions.setPlaybackIndex(null);
        return;
      }

      const newPlaybackIndex = lyricsData.findIndex(
        (word) =>
          word.start !== null &&
          word.end !== null &&
          currentTime >= word.start &&
          currentTime < word.end
      );

      actions.setPlaybackIndex(newPlaybackIndex > -1 ? newPlaybackIndex : null);

      if (newPlaybackIndex > -1) {
        const word = lyricsData[newPlaybackIndex];
        if (
          word &&
          selectedLineIndex !== word.lineIndex &&
          editingLineIndex === null
        ) {
          actions.selectLine(word.lineIndex);
        }
      }
    };

    const intervalId = setInterval(() => {
      if (playerControls.isPlaying()) {
        const currentTime = playerControls.getCurrentTime();
        actions.setCurrentTime(currentTime);
        syncLogic(currentTime);
      }
    }, 50); // Sync every 50ms

    return () => clearInterval(intervalId);
  }, [
    playerControls,
    lyricsData,
    actions,
    isTimingActive,
    correctionIndex,
    selectedLineIndex,
    editingLineIndex,
  ]);
};
