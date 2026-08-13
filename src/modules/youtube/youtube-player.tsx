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
import { useTimerStore } from "@/timer-worker/store";

/** Stable reference: the timer store's actions never change identity. */
const timer = useTimerStore.getState;

type Props = {
  youtubeId: string | null;
  videoOnly?: boolean;
  onReady: (event: { target: any }) => void;
  containerClassName?: string;
};

export type YouTubePlayerRef = {
  play: () => void;
  pause: () => void;
  seek: (time: number) => Promise<void>;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
  isReady: boolean;
  destroy: () => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
};

const YoutubePlayer = forwardRef<YouTubePlayerRef, Props>(
  ({ youtubeId, onReady, videoOnly, containerClassName }, ref) => {
    const playerRef = useRef<YouTubePlayer | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [playerState, setPlayerState] = useState(false);

    const actions = useKaraokeStore((state) => state.actions);

    const [fileName, setFileName] = useState("Load a YouTube URL");
    const [duration, setDuration] = useState(0);

    useImperativeHandle(ref, () => ({
      play: () => playerRef.current?.playVideo(),
      pause: () => playerRef.current?.pauseVideo(),
      seek: (time: number) => {
        playerRef.current?.seekTo(time, true);
        timer().seekTimer(time);
        return Promise.resolve();
      },
      setPlaybackRate: (rate: number) => playerRef.current?.setPlaybackRate(rate),
      setVolume: (volume: number) =>
        playerRef.current?.setVolume(Math.round(volume * 100)),
      getCurrentTime: () => timer().presentationValue,
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
      timer().resetTimer();

      setTimeout(() => {
        timer().updateDuration(duration, "seconds");
      }, 100);
    };

    const handleStateChange = (e: { data: number }) => {
      const isCurrentlyPlaying = e.data === 1;

      setPlayerState(isCurrentlyPlaying);
      actions.setIsPlaying(isCurrentlyPlaying);

      if (isCurrentlyPlaying) {
        timer().seekTimer(playerRef.current?.getCurrentTime() ?? 0);
        timer().startTimer();
      } else {
        timer().stopTimer();
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
      timer().seekTimer(0);
    };

    const handleSeek = (value: number) => {
      playerRef.current?.seekTo(value, true);
      timer().seekTimer(value);
    };

    useEffect(() => {
      // The iframe only exposes a polled currentTime, so re-syncing against it
      // matters more here than anywhere else.
      timer().initWorker({
        mode: "Time",
        position: () => playerRef.current?.getCurrentTime() ?? null,
      });
      return () => timer().terminateWorker();
    }, []);

    return (
      <Card className={`lg:p-4 bg-panel/50 h-full rounded-lg w-full space-y-3`}>
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
