// src/hooks/usePlaybackSync.ts
import { useEffect } from "react";
import { useKaraokeStore } from "../stores/karaoke-store";
import { PlayerControls } from "./useKeyboardControls";

export const usePlaybackSync = (playerControls: PlayerControls | null) => {
  const currentTime = useKaraokeStore((state) => state.currentTime);
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const isTimingActive = useKaraokeStore((state) => state.isTimingActive);
  const correctionIndex = useKaraokeStore((state) => state.correctionIndex);
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex);
  const editingLineIndex = useKaraokeStore((state) => state.editingLineIndex);
  const actions = useKaraokeStore((state) => state.actions);
  const isPlaying = useKaraokeStore((state) => state.isPlaying);

  useEffect(() => {
    if (!playerControls) return;
    if (!isPlaying) return;

    if (!playerControls.isPlaying() && currentTime > 0) {
      actions.setIsPlaying(false);
      return;
    }

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
  }, [
    currentTime,
    playerControls,
    lyricsData,
    isTimingActive,
    correctionIndex,
    selectedLineIndex,
    editingLineIndex,
    actions,
    isPlaying,
  ]);
};
