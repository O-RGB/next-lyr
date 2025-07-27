import React, { useEffect } from "react";
import { MusicMode } from "../../types/type";
import ButtonCommon, { ButtonCommonProps } from "./button";

type RulerProps = {
  max?: number;
  step?: number;
  startTime?: number | null;
  endTime?: number | null;
  onRulerClick?: (percentage: number) => void;
  // buttonProps?: ButtonCommonProps;
  currentPlaybackPercentage?: number | null;
  mode: MusicMode | null;
};

export default function Ruler({
  max = 300,
  step = 50,
  startTime = null,
  endTime = null,
  onRulerClick,
  currentPlaybackPercentage,
  mode,
}: // buttonProps = {
//   hidden: true,
// },
RulerProps) {
  const formatTimeValue = (value: number | null) => {
    if (value === null) return "N/A";
    return mode === "mp3" ? value.toFixed(2) : value;
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

  const ticks = Array.from(
    { length: Math.floor(max / step) + 1 },
    (_, i) => i * step
  );

  // useEffect(() => {}, [buttonProps.hidden]);
  return (
    <div className="relative w-full" onClick={handleClick}>
      <div className="relative h-[1px] rounded-md bg-gray-200 shadow-inner">
        {ticks.map((tick, i) => (
          <div
            key={i}
            className={`absolute h-1 w-[1px] bg-gray-400`}
            style={{
              left: `${(tick / max) * 100}%`,
              transform: "translateX(-50%)",
              opacity: i % 2 === 0 ? 1 : 0.5,
            }}
          ></div>
        ))}

        {currentPlaybackPercentage !== null && (
          <div
            className="absolute w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-lg"
            style={{
              left: `${currentPlaybackPercentage}%`,
              top: "-0.5rem",
              transform: "translateX(-50%)",
              zIndex: 20,
            }}
          ></div>
        )}
      </div>

      {startTime !== null && (
        <div className="text-[8px] absolute top-1 -left-2 mt-2 text-gray-600 whitespace-nowrap">
          {formatTimeValue(startTime)}
        </div>
      )}

      {endTime !== null && (
        <div className="text-[8px] absolute top-1 right-1 mt-2 text-gray-600 whitespace-nowrap transform translate-x-1/2">
          {formatTimeValue(endTime)}
        </div>
      )}
    </div>
  );
}
