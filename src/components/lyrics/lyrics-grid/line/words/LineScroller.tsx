import React, { useRef, useEffect } from "react";
import { useKaraokeStore } from "@/stores/karaoke-store";

interface LineScrollerProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  lineIndex: number;
}

const LineScroller: React.FC<LineScrollerProps> = ({
  containerRef,
  lineIndex,
}) => {
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex);

  useEffect(() => {
    containerRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, [selectedLineIndex, lineIndex, containerRef]);

  return null;
};

export default LineScroller;
