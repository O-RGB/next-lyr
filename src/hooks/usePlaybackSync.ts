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
    timingBuffer, // 👈 ดึง timingBuffer มาใช้งาน
  } = useKaraokeStore();

  useEffect(() => {
    // --- ✨ Logic ที่แก้ไข ---
    // เอา isTimingActive ออกเพื่อให้ Playback Index อัปเดตเสมอ
    if (!playerControls || !isPlaying) {
      return;
    }
    // --- จบส่วนที่แก้ไข ---

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
    isTimingActive, // ยังคงต้องมีใน dependency array
    correctionIndex,
    selectedLineIndex,
    editingLineIndex,
    actions,
    isPlaying,
    timingBuffer,
  ]);
};
