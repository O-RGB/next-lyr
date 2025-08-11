import { useKaraokeStore } from "@/stores/karaoke-store";
import React from "react";

interface CurrentRulerTickProps {
  startTime: number;
  endTime: number;
}

const CurrentRulerTick: React.FC<CurrentRulerTickProps> = ({
  endTime,
  startTime,
}) => {
  const playbackPercentage = useKaraokeStore((s) => {
    if (
      startTime === null ||
      endTime === null ||
      s.currentTime === null ||
      endTime <= startTime
    ) {
      return 0;
    }

    const lineDuration = endTime - startTime;
    const position = s.currentTime - startTime;
    const percentage = (position / lineDuration) * 100;
    return Math.min(100, Math.max(0, percentage));
  });

  return (
    <>
      {playbackPercentage > 0 && (
        <div
          className="absolute w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-lg z-30"
          style={{
            left: `${playbackPercentage}%`,
            top: "-0.5rem",
            transform: "translateX(-50%)",
            zIndex: 20,
          }}
        />
      )}
    </>
  );
};

export default CurrentRulerTick;
