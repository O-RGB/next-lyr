import { useKaraokeStore } from "@/stores/karaoke-store";
import { useLayoutEffect } from "react";

export const AutoScroller: React.FC<{
  containerRef: React.RefObject<HTMLDivElement | null>;
  pixelsPerTick: number;
  playheadPosition: number;
}> = ({ containerRef, pixelsPerTick }) => {
  const currentTime = useKaraokeStore((state) => state.currentTime);
  const isAutoScrolling = useKaraokeStore(
    (state) => state.isChordPanelAutoScrolling
  );

  useLayoutEffect(() => {
    if (!containerRef.current || !isAutoScrolling) return;

    const targetScrollTop = currentTime * pixelsPerTick;

    const clampedScrollTop = Math.max(0, targetScrollTop);

    containerRef.current.scrollTop = clampedScrollTop;
  }, [currentTime, isAutoScrolling, pixelsPerTick, containerRef]);

  return null;
};
