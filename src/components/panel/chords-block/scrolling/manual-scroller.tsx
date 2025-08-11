import { useKaraokeStore } from "@/stores/karaoke-store";
import { useLayoutEffect } from "react";

export const ManualScroller: React.FC<{
  containerRef: React.RefObject<HTMLDivElement | null>;
  pixelsPerTick: number;
  isMobile: boolean;
  playheadPosition: number;
}> = ({ containerRef, pixelsPerTick, isMobile, playheadPosition }) => {
  const centerTick = useKaraokeStore((state) => state.chordPanelCenterTick);
  const isAutoScrolling = useKaraokeStore(
    (state) => state.isChordPanelAutoScrolling
  );

  useLayoutEffect(() => {
    if (!containerRef.current || isAutoScrolling) return;

    const targetScrollPos = Math.max(0, centerTick * pixelsPerTick);

    if (isMobile) {
      containerRef.current.scrollLeft = targetScrollPos;
    } else {
      containerRef.current.scrollTop = targetScrollPos;
    }
  }, [centerTick, isAutoScrolling, pixelsPerTick, containerRef, isMobile]);

  return null;
};
