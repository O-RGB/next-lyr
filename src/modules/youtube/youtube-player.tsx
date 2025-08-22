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
import InputCommon from "@/components/common/data-input/input";
import ButtonCommon from "@/components/common/button";
import CommonPlayerStyle from "@/components/common/player";
import { TimerControls } from "@/components/ui/player-host";
import { useTimerStore } from "@/hooks/useTimerWorker";

type Props = {
  youtubeId: string | null;
  onUrlChange: (url: string) => void;
  onReady: (event: { target: any }) => void;
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
  ({ youtubeId, onUrlChange, onReady }, ref) => {
    const playerRef = useRef<YouTubePlayer | null>(null);
    const [url, setUrl] = useState("");
    const [isReady, setIsReady] = useState(false);
    const [playerState, setPlayerState] = useState(-1);

    const { setIsPlaying } = useKaraokeStore((state) => state.actions);
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
      getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
      isPlaying: () => playerState === 1,
      isReady: isReady,
      destroy: () => {
        playerRef.current?.destroy();
      },
    }));

    const handleReady = (event: { target: YouTubePlayer }) => {
      playerRef.current = event.target;
      setDuration(event.target.getDuration());
      setIsReady(true);
      onReady(event);
      timerControls.resetTimer();
    };

    const handleStateChange = (e: { data: number }) => {
      setPlayerState(e.data);
      const isCurrentlyPlaying = e.data === 1;
      setIsPlaying(isCurrentlyPlaying);

      if (isCurrentlyPlaying) {
        timerControls.seekTimer(playerRef.current?.getCurrentTime() ?? 0);
        timerControls.startTimer();
      } else {
        timerControls.stopTimer();
      }
    };

    const opts = {
      height: "320",
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

    const isPlaying = playerState === 1;

    const togglePlayPause = () => {
      if (isPlaying) {
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
      return () => timerControls.terminateWorker();
    }, [timerControls.initWorker, timerControls.terminateWorker]);

    return (
      <Card className="bg-white/50 p-4 rounded-lg w-full space-y-3">
        <div className="relative">
          {youtubeId ? (
            <YouTube
              videoId={youtubeId}
              opts={opts}
              onReady={handleReady}
              onStateChange={handleStateChange}
              className="rounded-lg overflow-hidden"
            />
          ) : (
            <div className="h-[320px] w-full bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
              Please load a YouTube URL
            </div>
          )}
          <div className="absolute top-0 left-0 w-full h-full bg-transparent z-10"></div>
        </div>

        <CommonPlayerStyle
          fileName={fileName}
          isPlaying={isPlaying}
          onFileChange={() => {}}
          onPlayPause={togglePlayPause}
          onStop={handleStop}
          onSeek={handleSeek}
          duration={duration}
          accept=""
          upload={false}
        />

        <div className="flex gap-2">
          <InputCommon
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter YouTube URL"
          />
          <ButtonCommon
            onClick={() => onUrlChange(url)}
            className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Load
          </ButtonCommon>
        </div>
      </Card>
    );
  }
);

YoutubePlayer.displayName = "YoutubePlayer";
export default YoutubePlayer;
