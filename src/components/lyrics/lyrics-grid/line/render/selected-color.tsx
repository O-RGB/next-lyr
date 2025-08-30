import { useKaraokeStore } from "@/stores/karaoke-store";
import React from "react";

interface SelectedColorLineProps {
  lineIndex: number;
}

const SelectedColorLine: React.FC<SelectedColorLineProps> = ({ lineIndex }) => {
  const isSelected = useKaraokeStore(
    (state) => state.selectedLineIndex === lineIndex
  );
  if (isSelected) {
    return (
      <div
        className={`bg-violet-100 absolute w-full h-full top-0 left-0 z-1`}
      ></div>
    );
  } else {
    return null;
  }
};

export default SelectedColorLine;
