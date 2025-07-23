// update/hooks/usePlaybackSync.ts
import { useEffect, RefObject } from "react";
import { useKaraokeStore } from "../store/useKaraokeStore";
import { MidiPlayerRef } from "../modules/js-synth";
import { VideoPlayerRef } from "../modules/video/video-player"; // <-- Import
import { YouTubePlayerRef } from "../modules/youtube/youtube-player"; // <-- Import

export const usePlaybackSync = (
  audioRef: RefObject<HTMLAudioElement | null>,
  videoRef: RefObject<VideoPlayerRef | null>,
  youtubeRef: RefObject<YouTubePlayerRef | null>,
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

  const syncLogic = (currentTime: number) => {
    if (isPreviewing || (isTimingActive && correctionIndex === null)) {
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
    const videoPlayer = videoRef.current;
    const video = videoPlayer?.videoEl;
    if (!video || mode !== "mp4") return;

    const handleTimeUpdate = () => {
      actions.setCurrentTime(video.currentTime);
      if (!video.paused) syncLogic(video.currentTime);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [
    videoRef,
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
    const youtubePlayer = youtubeRef.current;
    if (!youtubePlayer || mode !== "youtube" || !youtubePlayer.isReady) return;

    let animationFrameId: number | null = null;

    const animate = () => {
      if (!youtubePlayer.isPlaying()) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        return;
      }
      const currentTime = youtubePlayer.getCurrentTime();
      actions.setCurrentTime(currentTime);
      syncLogic(currentTime);
      animationFrameId = requestAnimationFrame(animate);
    };

    // เริ่ม loop เมื่อมีการเล่น
    const intervalId = setInterval(() => {
      if (youtubePlayer.isPlaying() && !animationFrameId) {
        animate();
      }
    }, 100);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      clearInterval(intervalId);
    };
  }, [
    youtubeRef,
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
      actions.setCurrentTime(tick);
      if (player.isPlaying) syncLogic(tick);
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
