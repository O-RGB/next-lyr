"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from "react";
import { useKaraokeStore } from "@/stores/karaoke-store";
import MidiPlayer, { MidiPlayerRef } from "@/modules/js-synth/player";
import AudioPlayer, { AudioPlayerRef } from "@/modules/audio/audio-player";
import VideoPlayer, { VideoPlayerRef } from "@/modules/video/video-player";
import YoutubePlayer, {
  YouTubePlayerRef,
} from "@/modules/youtube/youtube-player";

export type TimerControls = {
  startTimer: () => void;
  stopTimer: () => void;
  seekTimer: (time: number) => void;
  resetTimer: () => void;
};

export type PlayerRef = {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
};

type PlayerHostProps = {
  onReady?: () => void;
};

const PlayerHost = forwardRef<PlayerRef, PlayerHostProps>(
  ({ onReady }, ref) => {
    const mode = useKaraokeStore((state) => state.mode);
    const playerState = useKaraokeStore((state) => state.playerState);
    const actions = useKaraokeStore((state) => state.actions);

    const midiPlayerRef = useRef<MidiPlayerRef>(null);
    const audioPlayerRef = useRef<AudioPlayerRef>(null);
    const videoRef = useRef<VideoPlayerRef>(null);
    const youtubeRef = useRef<YouTubePlayerRef>(null);

    useEffect(() => {
      return () => {};
    }, []);

    useEffect(() => {}, [mode]);

    useImperativeHandle(ref, () => {
      const refs = {
        midi: midiPlayerRef.current,
        mp3: audioPlayerRef.current,
        mp4: videoRef.current,
        youtube: youtubeRef.current,
      };

      return refs[mode!] as any;
    });

    const onPlayerReady = (event: { target: any }) => {
      const duration = event.target.getDuration();
      const videoData = event.target.getVideoData();

      if (videoData.video_id) {
        actions.loadYoutubeVideo(videoData.video_id, videoData.title, duration);
      }
      onReady?.();
    };

    switch (mode) {
      case "midi":
        return (
          <MidiPlayer
            ref={midiPlayerRef}
            file={playerState.storedFile?.file}
            onReady={() => {
              onReady?.();
            }}
          />
        );
      case "mp3":
        return (
          <AudioPlayer
            ref={audioPlayerRef}
            src={playerState.audioSrc}
            file={playerState.storedFile?.file}
            onReady={() => {
              onReady?.();
            }}
          />
        );
      case "mp4":
        return (
          <VideoPlayer
            ref={videoRef}
            src={playerState.videoSrc}
            file={playerState.storedFile?.file}
            onReady={() => {
              onReady?.();
            }}
          />
        );
      case "youtube":
        return (
          <YoutubePlayer
            ref={youtubeRef}
            youtubeId={playerState.youtubeId}
            onReady={onPlayerReady}
          />
        );
      default:
        console.warn("[PlayerHost] No valid mode selected:", mode);
        return null;
    }
  }
);

PlayerHost.displayName = "PlayerHost";
export default PlayerHost;
