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
      const activeMidiPlayer = midiPlayerRef.current;
      const activeVideoPlayer = videoRef.current;
      const activeYoutubePlayer = youtubeRef.current;

      return () => {
        if (activeMidiPlayer) {
          activeMidiPlayer.destroy();
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
        mp3: audioPlayerRef.current,
        mp4: videoRef.current,
        youtube: youtubeRef.current,
      };

      return refs[mode!] as any;
    });

    const handleYoutubeUrlChange = (url: string) => {
      const getYouTubeId = (url: string): string | null => {
        const regExp =
          /^.*(http:\/\/googleusercontent.com\/youtube.com\/0\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
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
      console.log("videoData.video_id", videoData.video_id);
      if (videoData.video_id) {
        actions.loadYoutubeVideo(videoData.video_id, videoData.title, duration);
      }
    };

    switch (mode) {
      case "midi":
        return (
          <MidiPlayer
            ref={midiPlayerRef}
            file={playerState.rawFile}
            onReady={onReady}
          />
        );
      case "mp3":
        return (
          <AudioPlayer
            ref={audioPlayerRef}
            src={playerState.audioSrc}
            file={playerState.rawFile}
            onReady={onReady}
          />
        );
      case "mp4":
        return (
          <VideoPlayer
            ref={videoRef}
            src={playerState.videoSrc}
            file={playerState.rawFile}
            onReady={onReady}
          />
        );
      case "youtube":
        return (
          <YoutubePlayer
            ref={youtubeRef}
            youtubeId={playerState.youtubeId}
            onUrlChange={handleYoutubeUrlChange}
            onReady={(e) => {
              onPlayerReady(e); // ทำงานโหลดข้อมูล
              onReady?.(); // แจ้ง LyrEditerPanel ว่า ready แล้ว
            }}
          />
        );

      default:
        return null;
    }
  }
);

PlayerHost.displayName = "PlayerHost";
export default PlayerHost;
