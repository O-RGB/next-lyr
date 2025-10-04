import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
} from "react";
import YouTube from "react-youtube";
import type { YouTubePlayer } from "react-youtube";
import { useKaraokeStore } from "../../stores/karaoke-store";
import Card from "../../components/common/card";
import CommonPlayerStyle from "@/components/common/player";
import { useTimerStore } from "@/hooks/useTimerWorker";

type Props = {
  youtubeId: string | null;
  videoOnly?: boolean;
  onReady: (event: { target: any }) => void;
  containerClassName?: string;
};

export type YouTubePlayerRef = {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
  isReady: boolean;
  destroy: () => void;
};

const YoutubePlayer = forwardRef<YouTubePlayerRef, Props>(
  ({ youtubeId, onReady, videoOnly, containerClassName }, ref) => {
    const playerRef = useRef<YouTubePlayer | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [playerState, setPlayerState] = useState(false);

    const actions = useKaraokeStore((state) => state.actions);
    const timerControls = useTimerStore();

    const [fileName, setFileName] = useState("Load a YouTube URL");
    const [duration, setDuration] = useState(0);

    useImperativeHandle(ref, () => ({
      play: () => playerRef.current?.playVideo(),
      pause: () => playerRef.current?.pauseVideo(),
      seek: (time: number) => {
        playerRef.current?.seekTo(time, true);
        timerControls.seekTimer(time);
      },
      getCurrentTime: () => useKaraokeStore.getState().currentTime,
      isPlaying: () => playerRef.current.getPlayerState() === 1,
      isReady: isReady,
      destroy: () => {
        playerRef.current?.destroy();
      },
    }));

    const handleReady = (event: { target: YouTubePlayer }) => {
      playerRef.current = event.target;
      const videoData = event.target.getVideoData();

      const duration = event.target.getDuration();
      setFileName(videoData.title);
      setDuration(duration);
      setIsReady(true);
      onReady(event);
      timerControls.resetTimer();

      setTimeout(() => {
        timerControls.updateDuration(duration);
      }, 100);
    };

    const handleStateChange = (e: { data: number }) => {
      const isCurrentlyPlaying = e.data === 1;

      setPlayerState(isCurrentlyPlaying);
      actions.setIsPlaying(isCurrentlyPlaying);

      if (isCurrentlyPlaying) {
        timerControls.seekTimer(playerRef.current?.getCurrentTime() ?? 0);
        timerControls.startTimer();
      } else {
        timerControls.stopTimer();
      }
    };

    const opts = {
      height: "100%",
      width: "100%",
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        showinfo: 0,
        rel: 0,
        iv_load_policy: 3,
      },
    };

    const togglePlayPause = () => {
      if (playerState) {
        playerRef.current?.pauseVideo();
      } else {
        playerRef.current?.playVideo();
      }
    };

    const handleStop = () => {
      playerRef.current?.seekTo(0, true);
      playerRef.current?.pauseVideo();
      timerControls.seekTimer(0);
    };

    const handleSeek = (value: number) => {
      playerRef.current?.seekTo(value, true);
      timerControls.seekTimer(value);
    };

    useEffect(() => {
      timerControls.initWorker();
      timerControls.updateMode("Time");
      return () => timerControls.terminateWorker();
    }, [timerControls.initWorker, timerControls.terminateWorker]);

    return (
      <Card className={`lg:p-4 bg-white/50 h-full rounded-lg w-full space-y-3`}>
        {youtubeId && (
          <div
            className={`relative overflow-hidden w-full h-full rounded-lg ${
              containerClassName || ""
            }`}
          >
            <div className="absolute top-1/2 left-1/2 w-[177.78%] h-full -translate-x-1/2 -translate-y-1/2 scale-125">
              <YouTube
                videoId={youtubeId}
                opts={opts}
                onReady={handleReady}
                onStateChange={handleStateChange}
                className="w-full h-full"
              />
            </div>
          </div>
        )}

        <div className="hidden lg:block">
          <CommonPlayerStyle
            fileName={fileName}
            isPlaying={playerState}
            onPlayPause={togglePlayPause}
            onStop={handleStop}
            onSeek={handleSeek}
            duration={duration}
          />
        </div>
      </Card>
    );
  }
);

YoutubePlayer.displayName = "YoutubePlayer";
export default YoutubePlayer;
