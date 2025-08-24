import { useKaraokeStore } from "@/stores/karaoke-store";
import React, { useEffect } from "react";

interface AutoMoveToLineProps {
  lineRefs: React.RefObject<(HTMLDivElement | null)[]>;
}

const AutoMoveToLine: React.FC<AutoMoveToLineProps> = ({ lineRefs }) => {
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex);
  const isTimingActive = useKaraokeStore((state) => state.isTimingActive);
  const currentIndex = useKaraokeStore((state) => state.currentIndex);
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const editingLineIndex = useKaraokeStore((state) => state.editingLineIndex);

  useEffect(() => {
    let lineToScroll: number | null = null;

    const isStamping = isTimingActive || editingLineIndex !== null;

    if (isStamping) {
      const currentWord = lyricsData[currentIndex];
      if (currentWord) {
        lineToScroll = currentWord.lineIndex;
      }
    } else {
      lineToScroll = selectedLineIndex;
    }

    if (lineToScroll !== null && lineRefs.current[lineToScroll]) {
      lineRefs.current[lineToScroll]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [
    selectedLineIndex,
    isTimingActive,
    editingLineIndex,
    currentIndex,
    lyricsData,
    lineRefs,
  ]);

  return null;
};

export default AutoMoveToLine;
