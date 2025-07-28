// update/modules/video/video-player.tsx
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";

import { useKaraokeStore } from "../../stores/karaoke-store";
import ButtonCommon from "../../components/common/button";
import Card from "../../components/common/card";

type Props = {
  src: string | null;
  onFileChange: (file: File) => void;
};

export type VideoPlayerRef = {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
  videoEl: HTMLVideoElement | null;
};

const VideoPlayer = forwardRef<VideoPlayerRef, Props>(
  ({ src, onFileChange }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const actions = useKaraokeStore((state) => state.actions);
    const [isPlaying, setIsPlaying] = useState(false);

    useImperativeHandle(ref, () => ({
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      seek: (time: number) => {
        if (videoRef.current) videoRef.current.currentTime = time;
      },
      getCurrentTime: () => videoRef.current?.currentTime ?? 0,
      isPlaying: () => !!videoRef.current && !videoRef.current.paused,
      videoEl: videoRef.current,
    }));

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleLoadedMetadata = () => {
        if (video.duration && isFinite(video.duration)) {
          actions.setAudioDuration(video.duration);
        }
      };

      video.addEventListener("play", handlePlay);
      video.addEventListener("pause", handlePause);
      video.addEventListener("ended", handlePause);
      video.addEventListener("loadedmetadata", handleLoadedMetadata);

      if (video.readyState >= 1) {
        handleLoadedMetadata();
      }

      return () => {
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePause);
        video.removeEventListener("ended", handlePause);
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      };
    }, [src, actions]);

    return (
      <Card className="bg-white/50 p-4 rounded-lg w-full">
        <video
          ref={videoRef}
          src={src || ""}
          className="w-full rounded-lg bg-black mb-4"
          controls
        />
        <ButtonCommon
          onClick={() => fileInputRef.current?.click()}
          className="w-full p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
        >
          Choose Video File
        </ButtonCommon>
        <input
          type="file"
          ref={fileInputRef}
          accept="video/mp4"
          className="hidden"
          onChange={(e) => e.target.files && onFileChange(e.target.files[0])}
        />
      </Card>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";
export default VideoPlayer;
