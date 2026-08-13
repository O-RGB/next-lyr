import { useKaraokeStore } from "@/stores/karaoke-store";
import { useTimerStore } from "@/timer-worker/store";
import { useEffect } from "react";

export const AutoScroller: React.FC<{
  containerRef: React.RefObject<HTMLDivElement | null>;
  pixelsPerTick: number;
  isMobile: boolean;
  playheadPosition: number;
}> = ({ containerRef, pixelsPerTick, isMobile, playheadPosition }) => {
  useEffect(() => {
    const sync = (currentTime: number) => {
      if (!containerRef.current) return;
      const targetScrollPos = Math.max(0, currentTime * pixelsPerTick);
      if (isMobile) containerRef.current.scrollLeft = targetScrollPos;
      else containerRef.current.scrollTop = targetScrollPos;
    };

    const state = useKaraokeStore.getState();
    if (state.isChordPanelAutoScrolling) {
      sync(useTimerStore.getState().presentationValue);
    }

    let lastCenterUpdateAt = Number.NEGATIVE_INFINITY;
    let lastScrollAt = Number.NEGATIVE_INFINITY;

    // Keep the transport clock outside React's render path. The DOM scroll can
    // follow the compensated clock at full cadence; the Zustand value used by
    // manual scrolling only needs a coarse checkpoint.
    const unsubscribeTimer = useTimerStore.subscribe((next, previous) => {
      if (
        useKaraokeStore.getState().isChordPanelAutoScrolling &&
        next.presentationValue !== previous.presentationValue
      ) {
        const now = performance.now();
        if (now - lastScrollAt >= 100) {
          sync(next.presentationValue);
          lastScrollAt = now;
        }
        if (now - lastCenterUpdateAt >= 1_000) {
          useKaraokeStore.getState().actions.setChordPanelCenterTick(
            next.presentationValue
          );
          lastCenterUpdateAt = now;
        }
      }
    });

    return unsubscribeTimer;
  }, [containerRef, isMobile, pixelsPerTick, playheadPosition]);

  return null;
};
