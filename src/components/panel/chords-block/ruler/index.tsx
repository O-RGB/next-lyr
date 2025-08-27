import React from "react";

const formatTickLabel = (value: number, mode: string): string => {
  if (value >= 1000) {
    const k = value / 1000;
    return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
  }

  return value < 10 ? value.toFixed(1) : value.toString();
};

interface RulerProps {
  totalDuration: number;
  mode: string;
  ppq: number;
  pixelsPerUnit: number;
  zoom: number;
  isMobile: boolean;
  draggedChordPosition: number | null;
}

const DragIndicator: React.FC<{
  position: number;
  isMobile: boolean;
}> = ({ position, isMobile }) => {
  if (position === null) return null;

  const style: React.CSSProperties = isMobile
    ? {
        left: `${position}px`,
        top: 0,
        height: "100%",
        width: "2px",
        borderWidth: 1,
        borderLeft: "20px solid rgba(255, 0, 0)",
      }
    : {
        top: `${position}px`,
        left: 0,
        width: "100%",
        height: "2px",
        borderWidth: 1,
        borderTop: "20px solid rgba(255, 0, 0)",
      };

  return <div className="absolute z-50 pointer-events-none" style={style} />;
};

export const Ruler: React.FC<RulerProps> = React.memo(
  ({
    totalDuration,
    mode,
    ppq,
    pixelsPerUnit,
    zoom,
    isMobile,
    draggedChordPosition,
  }) => {
    if (totalDuration === 0) return null;

    const intervals =
      mode === "midi"
        ? {
            major: ppq,
            minor: ppq / 4,
          }
        : zoom > 2.5
        ? { major: 1, minor: 0.2 }
        : zoom > 0.75
        ? { major: 5, minor: 1 }
        : { major: 10, minor: 2 };

    const ticks = [];
    for (let i = 0; i <= totalDuration; i += intervals.minor) {
      const isMajor = i % intervals.major < 1e-9;
      const position = i * pixelsPerUnit;

      ticks.push(
        <div
          key={i}
          className={isMobile ? "absolute top-0" : "absolute left-0"}
          style={
            isMobile ? { left: `${position}px` } : { top: `${position}px` }
          }
        >
          <div
            className={
              isMobile
                ? isMajor
                  ? "h-4 w-px bg-gray-400"
                  : "h-2 w-px bg-gray-200"
                : isMajor
                ? "w-4 h-px bg-gray-400"
                : "w-2 h-px bg-gray-200"
            }
          />
          {isMajor && (
            <span
              className={
                isMobile
                  ? "absolute top-5 text-[7px] text-gray-400 -translate-x-1/2"
                  : "absolute left-5 text-[7px] text-gray-400 -translate-y-1/2"
              }
            >
              {formatTickLabel(i, mode)}
              {mode !== "midi" && "s"}
            </span>
          )}
        </div>
      );
    }

    return (
      <>
        {ticks}
        {/* {draggedChordPosition !== null && (
          <DragIndicator
            position={draggedChordPosition * pixelsPerUnit}
            isMobile={isMobile}
          />
        )} */}
      </>
    );
  }
);

Ruler.displayName = "Ruler";
