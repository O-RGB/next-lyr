import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
} from "react";
import { useKaraokeStore } from "../../stores/karaoke-store";
import Card from "../../components/common/card";
import CommonPlayerStyle from "@/components/common/player";

type Props = {
  src: string | null;
  file?: File | null;
  onReady?: () => void;
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
  ({ src, file, onReady }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { loadVideoFile } = useKaraokeStore((state) => state.actions);

    const [fileName, setFileName] = useState("");
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

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
      const handleTimeUpdate = () => setCurrentTime(video.currentTime);
      const handleDurationChange = () => setDuration(video.duration);

      video.addEventListener("play", handlePlay);
      video.addEventListener("pause", handlePause);
      video.addEventListener("timeupdate", handleTimeUpdate);
      video.addEventListener("durationchange", handleDurationChange);

      return () => {
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePause);
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("durationchange", handleDurationChange);
      };
    }, []);

    useEffect(() => {
      if (file) {
        setFileName(file.name);
      }
    }, [file]);

    useEffect(() => {
      if (src && videoRef.current) {
        videoRef.current.src = src;
      }
    }, [src]);

    const handleFileChange = (file?: File) => {
      if (!file) return;
      const videoUrl = URL.createObjectURL(file);
      const tempVideo = document.createElement("video");
      tempVideo.src = videoUrl;
      setFileName(file.name);

      const handleMetadata = () => {
        loadVideoFile(videoUrl, file, tempVideo.duration);
        tempVideo.removeEventListener("loadedmetadata", handleMetadata);
      };

      tempVideo.addEventListener("loadedmetadata", handleMetadata);
    };

    const handlePlayPause = () => {
      if (isPlaying) {
        videoRef.current?.pause();
      } else {
        videoRef.current?.play();
      }
    };

    const handleStop = () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    };

    const handleSeek = (value: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = value;
      }
    };

    return (
      <Card className="bg-white/50 p-4 rounded-lg w-full space-y-3">
        <video
          ref={videoRef}
          src={src || ""}
          className="w-full rounded-lg bg-black"
          controls={false}
          onLoadedData={onReady}
        />
        <CommonPlayerStyle
          fileName={fileName}
          isPlaying={isPlaying}
          onFileChange={handleFileChange}
          onPlayPause={handlePlayPause}
          onStop={handleStop}
          onSeek={handleSeek}
          duration={duration}
          currentTime={currentTime}
          accept="video/mp4"
        />
      </Card>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";
export default VideoPlayer;
