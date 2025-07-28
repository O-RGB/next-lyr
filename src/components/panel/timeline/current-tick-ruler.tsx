import { useKaraokeStore } from "@/stores/karaoke-store";
import React, { useEffect } from "react";

interface CurrentTickRulerProps {
  pixelsPerUnit: number;
  timelineContainerRef: any;
}

const CurrentTickRuler: React.FC<CurrentTickRulerProps> = ({
  pixelsPerUnit,
  timelineContainerRef,
}) => {
  const currentTime = useKaraokeStore((state) => state.currentTime);
  useEffect(() => {
    const timelineContainer = timelineContainerRef.current;
    if (!timelineContainer || timelineContainer.clientWidth === 0) return;

    const playheadPositionX = currentTime * pixelsPerUnit;
    const containerWidth = timelineContainer.clientWidth;

    const targetScrollLeft = playheadPositionX - containerWidth / 2;
    const newScrollLeft = Math.max(0, targetScrollLeft);

    if (Math.abs(newScrollLeft - timelineContainer.scrollLeft) > 1) {
      timelineContainer.scrollTo({
        left: newScrollLeft,
        behavior: "smooth",
      });
    }
  }, [currentTime, pixelsPerUnit]);
  return (
    <>
      <div
        className="absolute top-0 w-0.5 bg-red-500 h-full z-30"
        style={{ left: `${currentTime * pixelsPerUnit}px` }}
      >
        <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
      </div>
    </>
  );
};

export default CurrentTickRuler;
