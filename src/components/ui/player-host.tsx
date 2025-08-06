"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from "react";
import { useKaraokeStore } from "@/stores/karaoke-store";
import MidiPlayer, { MidiPlayerRef } from "@/modules/js-synth/player";
import AudioPlayer from "@/modules/audio/audio-player";
import VideoPlayer, { VideoPlayerRef } from "@/modules/video/video-player";
import YoutubePlayer, {
  YouTubePlayerRef,
} from "@/modules/youtube/youtube-player";

export type PlayerRef = {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
};

const PlayerHost = forwardRef<PlayerRef, {}>((props, ref) => {
  const mode = useKaraokeStore((state) => state.mode);
  const { playerState, actions } = useKaraokeStore();

  const midiPlayerRef = useRef<MidiPlayerRef>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<VideoPlayerRef>(null);
  const youtubeRef = useRef<YouTubePlayerRef>(null);

  useEffect(() => {
    const activeMidiPlayer = midiPlayerRef.current;
    const activeAudioPlayer = audioRef.current;
    const activeVideoPlayer = videoRef.current;
    const activeYoutubePlayer = youtubeRef.current;

    return () => {
      if (activeMidiPlayer) {
        activeMidiPlayer.destroy();
      }

      if (activeAudioPlayer) {
        activeAudioPlayer.pause();
        activeAudioPlayer.removeAttribute("src");
        activeAudioPlayer.load();
      }

      if (activeVideoPlayer) {
        activeVideoPlayer.pause();
        if (activeVideoPlayer.videoEl) {
          activeVideoPlayer.videoEl.removeAttribute("src");
          activeVideoPlayer.videoEl.load();
        }
      }

      if (
        activeYoutubePlayer &&
        typeof activeYoutubePlayer.destroy === "function"
      ) {
        activeYoutubePlayer.destroy();
      }
    };
  }, [mode]);

  useImperativeHandle(ref, () => {
    const refs = {
      midi: midiPlayerRef.current,
      mp3: {
        play: () => audioRef.current?.play(),
        pause: () => audioRef.current?.pause(),
        seek: (time: number) => {
          if (audioRef.current) audioRef.current.currentTime = time;
        },
        getCurrentTime: () => audioRef.current?.currentTime ?? 0,
        isPlaying: () => !!audioRef.current && !audioRef.current.paused,
      },
      mp4: videoRef.current,
      youtube: youtubeRef.current,
    };

    return refs[mode!] as any
  });

  const handleYoutubeUrlChange = (url: string) => {
    const getYouTubeId = (url: string): string | null => {
      const regExp =
        /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      return match && match[2].length === 11 ? match[2] : null;
    };
    const videoId = getYouTubeId(url);
    if (videoId) {
      useKaraokeStore.setState({
        playerState: { ...playerState, youtubeId: videoId },
      });
    } else {
      alert("Invalid YouTube URL.");
    }
  };

  const onPlayerReady = (event: { target: any }) => {
    const duration = event.target.getDuration();
    const videoData = event.target.getVideoData();
    if (videoData.video_id) {
      actions.loadYoutubeVideo(videoData.video_id, videoData.title, duration);
    }
  };

  switch (mode) {
    case "midi":
      return <MidiPlayer ref={midiPlayerRef} />;
    case "mp3":
      return (
        <AudioPlayer
          audioRef={audioRef}
          src={playerState.audioSrc}
          onPlay={() => actions.setIsPlaying(true)}
          onPause={() => actions.setIsPlaying(false)}
          onStop={() => {
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              actions.setIsPlaying(false);
            }
          }}
        />
      );
    case "mp4":
      return <VideoPlayer ref={videoRef} src={playerState.videoSrc} />;
    case "youtube":
      return (
        <YoutubePlayer
          ref={youtubeRef}
          youtubeId={playerState.youtubeId}
          onUrlChange={handleYoutubeUrlChange}
          onReady={onPlayerReady}
        />
      );
    default:
      return null;
  }
});

PlayerHost.displayName = "PlayerHost";
export default PlayerHost;
