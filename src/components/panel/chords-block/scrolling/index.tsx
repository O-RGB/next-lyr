import { useKaraokeStore } from "@/stores/karaoke-store";
import { useLayoutEffect } from "react";

export const AutoScroller: React.FC<{
  containerRef: React.RefObject<HTMLDivElement | null>;
  pixelsPerTick: number;
  isMobile: boolean;
  playheadPosition: number;
}> = ({ containerRef, pixelsPerTick, isMobile, playheadPosition }) => {
  const currentTime = useKaraokeStore((state) => state.currentTime);
  const isAutoScrolling = useKaraokeStore(
    (state) => state.isChordPanelAutoScrolling
  );
  useLayoutEffect(() => {
    if (!containerRef.current || !isAutoScrolling) return;

    // vvvvvvvvvv จุดแก้ไข vvvvvvvvvv
    // แก้ไขการคำนวณตำแหน่ง Scroll ให้ถูกต้อง
    // โดยไม่ต้องลบ playheadPosition ออก เพราะ padding จัดการเรื่อง offset แล้ว
    const targetScrollPos = Math.max(0, currentTime * pixelsPerTick);
    // ^^^^^^^^^^ สิ้นสุดจุดแก้ไข ^^^^^^^^^^

    if (isMobile) {
      containerRef.current.scrollLeft = targetScrollPos;
    } else {
      containerRef.current.scrollTop = targetScrollPos;
    }
  }, [currentTime, isAutoScrolling, pixelsPerTick, containerRef, isMobile]);
  return null;
};
