// src/components/common/player/index.tsx
import { Pause, Play, Square } from "lucide-react";
import React from "react";
import { TimerRange } from "./render-time";

interface CommonPlayerStyleProps {
  fileName: string;
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onSeek: (value: number) => void;
  duration: number;
}

interface PlayerButtonsProps {
  fileName: string;
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
}

const PlayerButtons = React.memo<PlayerButtonsProps>(
  ({ fileName, isPlaying, onPlayPause, onStop }) => (
    <div className="flex justify-center items-center gap-2">
      <button
        onClick={onPlayPause}
        disabled={!fileName}
        className="p-3 bg-panel rounded-full shadow-md disabled:opacity-50 transition-transform transform active:scale-90"
      >
        {isPlaying ? (
          <Pause className="h-5 w-5 text-foreground" />
        ) : (
          <Play className="h-5 w-5 text-foreground" />
        )}
      </button>
      <button
        onClick={onStop}
        disabled={!fileName}
        className="p-3 bg-panel rounded-full shadow-md disabled:opacity-50 transition-transform transform active:scale-90"
      >
        <Square className="h-5 w-5 text-foreground" />
      </button>
    </div>
  )
);

PlayerButtons.displayName = "PlayerButtons";

const CommonPlayerStyle: React.FC<CommonPlayerStyleProps> = ({
  fileName,
  isPlaying,
  onPlayPause,
  onStop,
  onSeek,
  duration,
}) => {
  return (
    <div className="bg-panel/50 p-4 rounded-lg flex items-center justify-center gap-4 w-full">
      <PlayerButtons
        fileName={fileName}
        isPlaying={isPlaying}
        onPlayPause={onPlayPause}
        onStop={onStop}
      />
      <TimerRange
        duration={duration || 100}
        onSeek={onSeek}
        filename={fileName}
      ></TimerRange>
    </div>
  );
};

export default React.memo(CommonPlayerStyle);
