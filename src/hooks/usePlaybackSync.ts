import { useEffect, RefObject } from "react";
import { useKaraokeStore } from "../stores/karaoke-store";
import { MidiPlayerRef } from "../modules/js-synth/player";
import { VideoPlayerRef } from "../modules/video/video-player";
import { YouTubePlayerRef } from "../modules/youtube/youtube-player";

export const usePlaybackSync = (
  audioRef: RefObject<HTMLAudioElement | null>,
  videoRef: RefObject<VideoPlayerRef | null>,
  youtubeRef: RefObject<YouTubePlayerRef | null>,
  midiPlayerRef: RefObject<MidiPlayerRef | null>
) => {
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const mode = useKaraokeStore((state) => state.mode);
  const isTimingActive = useKaraokeStore((state) => state.isTimingActive);
  const correctionIndex = useKaraokeStore((state) => state.correctionIndex);
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex);
  const editingLineIndex = useKaraokeStore((state) => state.editingLineIndex);
  const actions = useKaraokeStore((state) => state.actions);

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || mode !== "mp3") return;

    const handleTimeUpdate = () => {
      actions.setCurrentTime(audio.currentTime);
      if (!audio.paused) syncLogic(audio.currentTime);
    };

    const intervalId = setInterval(handleTimeUpdate, 50);

    return () => clearInterval(intervalId);
  }, [audioRef, mode, lyricsData, actions, isTimingActive, correctionIndex]);

  useEffect(() => {
    const videoPlayer = videoRef.current;
    const video = videoPlayer?.videoEl;
    if (!video || mode !== "mp4") return;

    const handleTimeUpdate = () => {
      actions.setCurrentTime(video.currentTime);
      if (!video.paused) syncLogic(video.currentTime);
    };

    const intervalId = setInterval(handleTimeUpdate, 50);

    return () => clearInterval(intervalId);
  }, [videoRef, mode, lyricsData, actions, isTimingActive, correctionIndex]);

  useEffect(() => {
    const youtubePlayer = youtubeRef.current;
    if (!youtubePlayer || mode !== "youtube" || !youtubePlayer.isReady) return;

    const intervalId = setInterval(() => {
      if (youtubePlayer.isPlaying()) {
        const currentTime = youtubePlayer.getCurrentTime();
        actions.setCurrentTime(currentTime);
        syncLogic(currentTime);
      }
    }, 50);

    return () => clearInterval(intervalId);
  }, [youtubeRef, mode, lyricsData, actions, isTimingActive, correctionIndex]);

  useEffect(() => {
    const player = midiPlayerRef.current;
    if (!player || mode !== "midi") return;

    const handleTickUpdate = (tick: number) => {
      actions.setCurrentTime(tick);
      if (player.isPlaying) syncLogic(tick);
    };

    player.addEventListener("tickupdate", handleTickUpdate);
    return () => player.removeEventListener("tickupdate", handleTickUpdate);
  }, [
    midiPlayerRef,
    mode,
    lyricsData,
    actions,
    isTimingActive,
    correctionIndex,
  ]);
};
