import { useKaraokeStore } from "@/stores/karaoke-store";
import React from "react";

interface SelectedColorLineProps {
  lineIndex: number;
}

const SelectedColorLine: React.FC<SelectedColorLineProps> = ({ lineIndex }) => {
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex);
  return (
    <div
      className={`${
        selectedLineIndex === lineIndex ? "bg-blue-50" : ""
      } absolute w-full h-full top-0 left-0 z-1`}
    ></div>
  );
};

export default SelectedColorLine;
