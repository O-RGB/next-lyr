import { useKaraokeStore } from "@/stores/karaoke-store";
import { useLayoutEffect } from "react";

export const ManualScroller: React.FC<{
  containerRef: React.RefObject<HTMLDivElement | null>;
  pixelsPerTick: number;
  playheadPosition: number;
}> = ({ containerRef, pixelsPerTick, playheadPosition }) => {
  const centerTick = useKaraokeStore((state) => state.chordPanelCenterTick);
  const isAutoScrolling = useKaraokeStore(
    (state) => state.isChordPanelAutoScrolling
  );

  useLayoutEffect(() => {
    if (!containerRef.current || isAutoScrolling) return;

    const targetScrollTop = centerTick * pixelsPerTick - playheadPosition;
    const clampedScrollTop = Math.max(0, targetScrollTop);

    containerRef.current.scrollTop = clampedScrollTop;
  }, [
    centerTick,
    isAutoScrolling,
    pixelsPerTick,
    playheadPosition,
    containerRef,
  ]);

  return null;
};
