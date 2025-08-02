import React from "react";

interface BeatIndicatorProps {
  timeSignatureNumerator?: number;
  currentBeat: number;
}

const BeatIndicator: React.FC<BeatIndicatorProps> = ({
  timeSignatureNumerator = 4,
  currentBeat,
}) => {
  const beats = Array.from({ length: timeSignatureNumerator }, (_, i) => i);

  return (
    <div className="flex items-center gap-1.5">
      {beats.map((beat) => (
        <div
          key={beat}
          className={`
            w-2 h-2 rounded-full
            ${
              currentBeat === beat
                ? "bg-green-400 shadow-[0_0_4px_1px_rgba(134,239,172,0.7)]"
                : "bg-gray-600"
            }
          `}
        ></div>
      ))}
    </div>
  );
};

export default BeatIndicator;
