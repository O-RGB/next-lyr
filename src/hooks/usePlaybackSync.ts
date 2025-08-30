import { useEffect } from "react";
import { useKaraokeStore } from "../stores/karaoke-store";
import { PlayerControls } from "./useKeyboardControls";

export const usePlaybackSync = (playerControls: PlayerControls | null) => {
  const actions = useKaraokeStore((state) => state.actions);
  const {
    currentTime,
    lyricsData,
    isTimingActive,
    correctionIndex,
    selectedLineIndex,
    editingLineIndex,
    isPlaying,
    timingBuffer,
  } = useKaraokeStore();

  useEffect(() => {
    if (!playerControls || !isPlaying) {
      return;
    }

    const flatLyricsData = lyricsData.flat();

    const newPlaybackIndex = flatLyricsData.findIndex((word) => {
      const bufferEntry = timingBuffer?.buffer.get(word.index);
      const start = bufferEntry?.start ?? word.start;
      const end = bufferEntry?.end ?? word.end;

      return (
        start !== null &&
        end !== null &&
        currentTime >= start &&
        currentTime < end
      );
    });

    actions.setPlaybackIndex(newPlaybackIndex > -1 ? newPlaybackIndex : null);

    if (newPlaybackIndex > -1) {
      const word = flatLyricsData[newPlaybackIndex];
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
    timingBuffer,
  ]);
};
