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
import { TimerControls } from "@/components/ui/player-host";
import { useTimerStore } from "@/hooks/useTimerWorker";

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
    const { loadVideoFile, setIsPlaying: setGlobalIsPlaying } = useKaraokeStore(
      (state) => state.actions
    );
    const timerControls = useTimerStore();

    const [fileName, setFileName] = useState("");
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);

    useImperativeHandle(ref, () => ({
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      seek: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
          timerControls.seekTimer(time); // <<< เพิ่มบรรทัดนี้
        }
      },
      getCurrentTime: () => videoRef.current?.currentTime ?? 0,
      isPlaying: () => !!videoRef.current && !videoRef.current.paused,
      videoEl: videoRef.current,
    }));

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handlePlay = () => {
        setIsPlaying(true);
        setGlobalIsPlaying(true);
        timerControls.startTimer();
      };
      const handlePause = () => {
        setIsPlaying(false);
        setGlobalIsPlaying(false);
        timerControls.stopTimer();
      };
      const handleDurationChange = () => setDuration(video.duration);

      video.addEventListener("play", handlePlay);
      video.addEventListener("pause", handlePause);
      video.addEventListener("durationchange", handleDurationChange);

      return () => {
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePause);
        video.removeEventListener("durationchange", handleDurationChange);
      };
    }, [setGlobalIsPlaying, timerControls]);

    useEffect(() => {
      if (file) {
        setFileName(file.name);
      }
    }, [file]);

    useEffect(() => {
      timerControls.initWorker();
      return () => timerControls.terminateWorker();
    }, [timerControls.initWorker, timerControls.terminateWorker]);

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
        timerControls.resetTimer();
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
        timerControls.seekTimer(0);
      }
    };

    const handleSeek = (value: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = value;
        timerControls.seekTimer(value);
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
          // onFileChange={handleFileChange}
          onPlayPause={handlePlayPause}
          onStop={handleStop}
          onSeek={handleSeek}
          duration={duration}
          // accept="video/mp4"
        />
      </Card>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";
export default VideoPlayer;
