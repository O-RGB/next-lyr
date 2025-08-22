import { useKaraokeStore } from "@/stores/karaoke-store";
import { MusicMode } from "@/types/common.type";
import React, { useMemo } from "react";
import CurrentRulerTick from "./current-ruler-tick";

type RulerProps = {
  max?: number;
  step?: number;
  startTime?: number | null;
  lineIndex?: number | null;
  endTime?: number | null;
  onRulerClick?: (percentage: number) => void;
  mode: MusicMode | null;
};

function RulerComponent({
  max = 300,
  step = 50,
  startTime = null,
  lineIndex,
  endTime = null,
  onRulerClick,
  mode,
}: RulerProps) {
  const formatTimeValue = (value: number | null) => {
    if (value === null) return "N/A";
    return value.toFixed(2);
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

  // สร้าง tick lines ด้วย useMemo
  const ticks = useMemo(
    () =>
      Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step),
    [max, step]
  );

  return (
    <div className="relative w-full" onClick={handleClick}>
      <div className="relative h-[1px] rounded-md bg-gray-200 shadow-inner">
        {ticks.map((tick, i) => (
          <div
            key={i}
            className="absolute h-1 w-[1px] bg-gray-400"
            style={{
              left: `${(tick / max) * 100}%`,
              transform: "translateX(-50%)",
              opacity: i % 2 === 0 ? 1 : 0.5,
            }}
          />
        ))}
        {endTime && startTime && (
          <CurrentRulerTick
            endTime={endTime}
            startTime={startTime}
          ></CurrentRulerTick>
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

export default React.memo(RulerComponent);
