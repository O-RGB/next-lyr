// update/components/common/ruler.tsx
import React from "react";

type RulerProps = {
  max?: number;
  step?: number;
  startTime?: number | null; // New prop for start time
  endTime?: number | null; // New prop for end time
  onRulerClick?: (percentage: number) => void; // New prop for click event
};

export default function Ruler({
  max = 300,
  step = 50,
  startTime = null,
  endTime = null,
  onRulerClick,
}: RulerProps) {
  const formatTimeValue = (value: number | null) => {
    if (value === null) return "N/A";
    return value;
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
