// update/modules/youtube/youtube-player.tsx
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import YouTube from "react-youtube";
import type { YouTubePlayer } from "react-youtube";
import { useKaraokeStore } from "../../stores/karaoke-store";
import ButtonCommon from "../../components/common/button";
import Card from "../../components/common/card";
import InputCommon from "@/components/common/data-input/input";

type Props = {
  youtubeId: string | null;
  onUrlChange: (url: string) => void;
};

export type YouTubePlayerRef = {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
  isReady: boolean;
};

const YoutubePlayer = forwardRef<YouTubePlayerRef, Props>(
  ({ youtubeId, onUrlChange }, ref) => {
    const playerRef = useRef<YouTubePlayer | null>(null);
    const [url, setUrl] = useState("");
    const [isReady, setIsReady] = useState(false);
    const [playerState, setPlayerState] = useState(-1);
    const actions = useKaraokeStore((state) => state.actions);

    useImperativeHandle(ref, () => ({
      play: () => playerRef.current?.playVideo(),
      pause: () => playerRef.current?.pauseVideo(),
      seek: (time: number) => playerRef.current?.seekTo(time, true),
      getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
      isPlaying: () => playerState === 1,
      isReady: isReady,
    }));

    const onPlayerReady = (event: { target: YouTubePlayer }) => {
      playerRef.current = event.target;
      setIsReady(true);
      // ดึงข้อมูลวิดีโอเมื่อพร้อม
      const duration = event.target.getDuration();
      const videoData = event.target.getVideoData();
      actions.setAudioDuration(duration);
      actions.setMetadata({ TITLE: videoData.title, ARTIST: videoData.author });
    };

    const opts = {
      height: "320",
      width: "100%",
      playerVars: {
        autoplay: 0,
        controls: 1,
      },
    };

    return (
      <Card className="bg-white/50 p-4 rounded-lg w-full space-y-3">
        {youtubeId ? (
          <YouTube
            videoId={youtubeId}
            opts={opts}
            onReady={onPlayerReady}
            onStateChange={(e) => setPlayerState(e.data)}
            className="rounded-lg overflow-hidden"
          />
        ) : (
          <div className="h-[320px] w-full bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
            Please load a YouTube URL
          </div>
        )}
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
