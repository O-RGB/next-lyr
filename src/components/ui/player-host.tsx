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
import AllowSound from "@/allow-sound";

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
  timerControls: TimerControls;
};

const PlayerHost = forwardRef<PlayerRef, PlayerHostProps>(
  ({ onReady, timerControls }, ref) => {
    const mode = useKaraokeStore((state) => state.mode);
    const playerState = useKaraokeStore((state) => state.playerState);
    const actions = useKaraokeStore((state) => state.actions);

    const midiPlayerRef = useRef<MidiPlayerRef>(null);
    const audioPlayerRef = useRef<AudioPlayerRef>(null);
    const videoRef = useRef<VideoPlayerRef>(null);
    const youtubeRef = useRef<YouTubePlayerRef>(null);

    useEffect(() => {
      console.log("[PlayerHost] mounted with mode:", mode);
      return () => {
        console.log("[PlayerHost] unmounted");
      };
    }, []);

    useEffect(() => {
      console.log("[PlayerHost] mode changed →", mode);
    }, [mode]);

    useImperativeHandle(ref, () => {
      const refs = {
        midi: midiPlayerRef.current,
        mp3: audioPlayerRef.current,
        mp4: videoRef.current,
        youtube: youtubeRef.current,
      };
      console.log("[PlayerHost] expose ref for mode:", mode, refs[mode!]);
      return refs[mode!] as any;
    });

    const handleYoutubeUrlChange = (url: string) => {
      console.log("[PlayerHost] YouTube URL changed:", url);
      const getYouTubeId = (url: string): string | null => {
        const regExp =
          /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return match && match[2].length === 11 ? match[2] : null;
      };
      const videoId = getYouTubeId(url);
      if (videoId) {
        console.log("[PlayerHost] Parsed YouTube videoId:", videoId);
        useKaraokeStore.setState({
          playerState: { ...playerState, youtubeId: videoId },
        });
      } else {
        console.warn("[PlayerHost] Invalid YouTube URL:", url);
        alert("Invalid YouTube URL.");
      }
    };

    const onPlayerReady = (event: { target: any }) => {
      console.log("[PlayerHost] onPlayerReady event:", event);
      const duration = event.target.getDuration();
      const videoData = event.target.getVideoData();
      console.log("[PlayerHost] Video Data:", videoData, "Duration:", duration);
      if (videoData.video_id) {
        console.log("[PlayerHost] Loading YouTube video into store");
        actions.loadYoutubeVideo(videoData.video_id, videoData.title, duration);
      }
      onReady?.();
    };

    switch (mode) {
      case "midi":
        console.log("[PlayerHost] rendering MidiPlayer", playerState);
        return (
          <MidiPlayer
            ref={midiPlayerRef}
            file={playerState.rawFile}
            onReady={() => {
              console.log("[MidiPlayer] ready");
              onReady?.();
            }}
            timerControls={timerControls}
          />
        );
      case "mp3":
        console.log("[PlayerHost] rendering AudioPlayer", playerState);
        return (
          <AudioPlayer
            ref={audioPlayerRef}
            src={playerState.audioSrc}
            file={playerState.rawFile}
            onReady={() => {
              console.log("[AudioPlayer] ready");
              onReady?.();
            }}
            timerControls={timerControls}
          />
        );
      case "mp4":
        console.log("[PlayerHost] rendering VideoPlayer", playerState);
        return (
          <VideoPlayer
            ref={videoRef}
            src={playerState.videoSrc}
            file={playerState.rawFile}
            onReady={() => {
              console.log("[VideoPlayer] ready");
              onReady?.();
            }}
            timerControls={timerControls}
          />
        );
      case "youtube":
        console.log("[PlayerHost] rendering YoutubePlayer", playerState);
        return (
          <YoutubePlayer
            ref={youtubeRef}
            youtubeId={playerState.youtubeId}
            onUrlChange={handleYoutubeUrlChange}
            onReady={onPlayerReady}
            timerControls={timerControls}
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
