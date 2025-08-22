import { useKaraokeStore } from "@/stores/karaoke-store";
import { LyricWordData } from "@/types/common.type";
import React from "react";

interface RulerLineWordProps {
  word: LyricWordData;
  position: { left: number; width: number };
  lineIndex: number;
  lineColor?: string;
}

const RulerLineWord: React.FC<RulerLineWordProps> = ({
  word,
  position,
  lineIndex,
  lineColor = "bg-green-500",
}) => {
  const currentIndex = useKaraokeStore((state) => state.currentIndex);
  const isTimingActive = useKaraokeStore((state) => state.isTimingActive);
  const correctionIndex = useKaraokeStore((state) => state.correctionIndex);
  const editingLineIndex = useKaraokeStore((state) => state.editingLineIndex);

  const isCurrentLine = useKaraokeStore(
    (state) => state.selectedLineIndex === lineIndex
  );
  const isPlaybackHighlight = useKaraokeStore(
    (state) => state.playbackIndex === word.index
  );

  const line = (color: string) => (
    <div
      className="flex items-center absolute h-full px-1"
      style={{ left: `${position.left}%`, width: `${position.width}%` }}
    >
      <div
        className={`${color} w-1.5 h-1.5 rounded-full`}
        title={`"${word.name}" Start: ${word.start}`}
      />
      <div className={`flex-1 h-[1px] ${color}`} />
      <div
        className={`${color} w-1.5 h-1.5 rounded-full`}
        title={`"${word.name}" End: ${word.end}`}
      />
    </div>
  );

  if (!isPlaybackHighlight || !isCurrentLine) return line(lineColor);

  const getWordColor = () => {
    const isActive =
      isCurrentLine &&
      currentIndex === word.index &&
      (isTimingActive || correctionIndex !== null);
    const isPendingCorrection = correctionIndex === word.index;
    const isEditing = editingLineIndex === word.lineIndex && !isTimingActive;

    if (isPendingCorrection) return "bg-orange-500";
    if (isActive) return "bg-blue-500";
    if (isEditing) return "bg-purple-400";
    if (isPlaybackHighlight) return "bg-amber-400";
    return lineColor;
  };

  const colorClass = getWordColor();

  return line(colorClass);
};

export default RulerLineWord;
