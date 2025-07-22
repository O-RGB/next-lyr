import { useEffect, RefObject } from "react";
import { useKaraokeStore } from "../store/useKaraokeStore";
import { MidiPlayerRef } from "../modules/js-synth";

export const usePlaybackSync = (
  audioRef: RefObject<HTMLAudioElement | null>,
  midiPlayerRef: RefObject<MidiPlayerRef | null>
) => {
  const {
    lyricsData,
    mode,
    isTimingActive,
    correctionIndex,
    isPreviewing,
    selectedLineIndex,
    editingLineIndex,
    actions,
  } = useKaraokeStore();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || mode !== "mp3") return;

    const handleTimeUpdate = () => {
      if (
        isPreviewing ||
        audio.paused ||
        (isTimingActive && correctionIndex === null)
      ) {
        actions.setPlaybackIndex(null);
        return;
      }
      const newPlaybackIndex = lyricsData.findIndex(
        (word) =>
          word.start !== null &&
          word.end !== null &&
          audio.currentTime >= word.start &&
          audio.currentTime < word.end
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

    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => audio.removeEventListener("timeupdate", handleTimeUpdate);
  }, [
    audioRef,
    mode,
    isPreviewing,
    isTimingActive,
    correctionIndex,
    lyricsData,
    actions,
    selectedLineIndex,
    editingLineIndex,
  ]);

  useEffect(() => {
    const player = midiPlayerRef.current;
    if (!player || mode !== "midi") return;

    const handleTickUpdate = (tick: number) => {
      if (
        isPreviewing ||
        !player.isPlaying ||
        (isTimingActive && correctionIndex === null)
      ) {
        actions.setPlaybackIndex(null);
        return;
      }
      const newPlaybackIndex = lyricsData.findIndex(
        (word) =>
          word.start !== null &&
          word.end !== null &&
          tick >= word.start &&
          tick < word.end
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

    player.addEventListener("tickupdate", handleTickUpdate);
    return () => player.removeEventListener("tickupdate", handleTickUpdate);
  }, [
    midiPlayerRef,
    mode,
    isPreviewing,
    isTimingActive,
    correctionIndex,
    lyricsData,
    actions,
    selectedLineIndex,
    editingLineIndex,
  ]);
};
