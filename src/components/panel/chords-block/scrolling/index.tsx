import { useKaraokeStore } from "@/stores/karaoke-store";
import { useLayoutEffect } from "react";

export const AutoScroller: React.FC<{
  containerRef: React.RefObject<HTMLDivElement | null>;
  pixelsPerTick: number;
  isMobile: boolean;
  playheadPosition: number;
}> = ({ containerRef, pixelsPerTick, isMobile, playheadPosition }) => {
  const actions = useKaraokeStore((state) => state.actions);
  const currentTime = useKaraokeStore((state) => state.currentTime);
  const isAutoScrolling = useKaraokeStore(
    (state) => state.isChordPanelAutoScrolling
  );

  useLayoutEffect(() => {
    if (!containerRef.current || !isAutoScrolling) return;

    const targetScrollPos = Math.max(0, currentTime * pixelsPerTick);

    if (isMobile) {
      containerRef.current.scrollLeft = targetScrollPos;
    } else {
      containerRef.current.scrollTop = targetScrollPos;
    }
    actions.setChordPanelCenterTick(currentTime);
  }, [currentTime, isAutoScrolling, pixelsPerTick, containerRef, isMobile]);
  return null;
};
