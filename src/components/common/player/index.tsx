// src/components/common/player/index.tsx
import React from "react";
import { FaPlay, FaPause, FaStop } from "react-icons/fa";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { TimerRange } from "./render-time";

interface CommonPlayerStyleProps {
  fileName: string;
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onSeek: (value: number) => void;
  duration: number;
}

const CommonPlayerStyle: React.FC<CommonPlayerStyleProps> = ({
  fileName,
  isPlaying,
  onPlayPause,
  onStop,
  onSeek,
  duration,
}) => {
  return (
    <div className="bg-white/50 p-4 rounded-lg flex items-center justify-center gap-4 w-full">
      {/* ปุ่มควบคุม Player */}
      <div className="flex justify-center items-center gap-2">
        <button
          onClick={onPlayPause}
          disabled={!fileName}
          className="p-3 bg-white rounded-full shadow-md disabled:opacity-50 transition-transform transform active:scale-90"
        >
          {isPlaying ? (
            <FaPause className="h-5 w-5 text-gray-700" />
          ) : (
            <FaPlay className="h-5 w-5 text-gray-700" />
          )}
        </button>
        <button
          onClick={onStop}
          disabled={!fileName}
          className="p-3 bg-white rounded-full shadow-md disabled:opacity-50 transition-transform transform active:scale-90"
        >
          <FaStop className="h-5 w-5 text-gray-700" />
        </button>
      </div>
      <TimerRange
        duration={duration || 100}
        onSeek={onSeek}
        filename={fileName}
      ></TimerRange>
    </div>
  );
};

export default CommonPlayerStyle;
