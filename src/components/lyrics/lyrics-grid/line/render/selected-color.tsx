import { useKaraokeStore } from "@/stores/karaoke-store";
import React from "react";

interface SelectedColorLineProps {
  lineIndex: number;
}

const SelectedColorLine: React.FC<SelectedColorLineProps> = ({ lineIndex }) => {
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex);

  if (selectedLineIndex === lineIndex) {
    return (
      <div
        className={`bg-blue-50 absolute w-full h-full top-0 left-0 z-1`}
      ></div>
    );
  } else {
    return null;
  }
};

export default SelectedColorLine;
