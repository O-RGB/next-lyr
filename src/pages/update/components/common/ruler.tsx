// update/components/common/ruler.tsx
import React from "react";

type RulerProps = {
  max?: number;
  step?: number;
  startTime?: number | null; // New prop for start time
  endTime?: number | null; // New prop for end time
  onRulerClick?: (percentage: number) => void; // New prop for click event
  currentPlaybackPercentage?: number | null; // New prop for playback indicator
  mode?: "mp3" | "midi" | null; // New prop for mode context
};

export default function Ruler({
  max = 300,
  step = 50,
  startTime = null,
  endTime = null,
  onRulerClick,
  currentPlaybackPercentage, // Destructure new prop
  mode, // Destructure new prop
}: RulerProps) {
  const formatTimeValue = (value: number | null) => {
    if (value === null) return "N/A";
    // Assuming ticks for midi, seconds for mp3
    if (mode === "mp3") {
      return value.toFixed(2); // Format seconds
    }
    return value; // Keep ticks as is
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      onRulerClick &&
      startTime !== null &&
      endTime !== null &&
      endTime > startTime
    ) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      onRulerClick(percentage);
    }
  };

  return (
    <div
      className="relative w-full h-0.5 opacity-45 cursor-pointer" // Added cursor-pointer
      style={{
        backgroundImage: `
          repeating-linear-gradient(to right, black 0, black 1px, transparent 1px, transparent 10px),
          repeating-linear-gradient(to right, black 0, black 2px, transparent 2px, transparent 50px)
        `,
        backgroundSize: "10px 100%, 50px 100%",
      }}
      onClick={handleClick} // Added onClick handler
    >
      {/* Playback Indicator (Running Circle) */}
      {currentPlaybackPercentage !== null && (
        <div
          className="absolute w-3 h-3 rounded-full bg-red-500 border border-white"
          style={{
            left: `${currentPlaybackPercentage}%`,
            top: "-0.5rem", // Adjust vertical position to be on the ruler line
            transform: "translateX(-50%)", // Center the circle on the percentage
            zIndex: 20, // Ensure it's on top
          }}
        ></div>
      )}

      {/* Start Time Label */}
      {startTime !== null && (
        <div className="text-[8px] absolute top-full -left-2 mt-2 whitespace-nowrap">
          {formatTimeValue(startTime)}
        </div>
      )}
      {/* End Time Label */}
      {endTime !== null && (
        <div className="text-[8px] absolute top-full right-1 mt-2 whitespace-nowrap transform translate-x-1/2">
          {formatTimeValue(endTime)}
        </div>
      )}
    </div>
  );
}
