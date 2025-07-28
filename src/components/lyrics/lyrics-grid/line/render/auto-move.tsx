import { useKaraokeStore } from "@/stores/karaoke-store";
import React, { useEffect } from "react";

interface AutoMoveToLineProps {
  lineRefs: React.RefObject<(HTMLDivElement | null)[]>;
}

const AutoMoveToLine: React.FC<AutoMoveToLineProps> = ({ lineRefs }) => {
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex);

  useEffect(() => {
    if (selectedLineIndex !== null && lineRefs.current[selectedLineIndex]) {
      lineRefs.current[selectedLineIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [selectedLineIndex]);
  return null;
};

export default AutoMoveToLine;
