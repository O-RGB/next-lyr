// src/components/lyrics/lyrics-grid/line/word/index.tsx
import { useKaraokeStore } from "@/stores/karaoke-store";
import { LyricWordData } from "@/types/common.type";
import React, { forwardRef } from "react";

type Props = {
  wordData: LyricWordData;
  editingLineIndex: number | null;
  lineIndex: number;
  onClick: (index: number) => void;
  onUpdate: (index: number, newWordData: Partial<LyricWordData>) => void;
  onDelete: (index: number) => void;
};

// vvvvvvvvvv จุดแก้ไข vvvvvvvvvv
const LyricWordComponent = forwardRef<HTMLDivElement, Props>(
  ({ wordData, editingLineIndex, lineIndex, onClick }, ref) => {
    const isActive = useKaraokeStore(
      (s) =>
        s.selectedLineIndex === lineIndex &&
        (s.isTimingActive || s.correctionIndex !== null) &&
        s.currentIndex === wordData.index
    );

    const isEditing = useKaraokeStore(
      (s) =>
        s.selectedLineIndex === lineIndex &&
        editingLineIndex === wordData.lineIndex &&
        !s.isTimingActive
    );

    const isPlaybackIndex = useKaraokeStore(
      (s) => s.playbackIndex === wordData.index
    );

    const isPendingCorrection = useKaraokeStore(
      (s) => s.correctionIndex === wordData.index
    );

    const isTimed = wordData.start !== null;

    const formatTimeValue = (value: number | null) => {
      if (value === null) return "N/A";
      return value > 1000 ? Math.round(value) : value.toFixed(2);
    };

    return (
      <div
        ref={ref}
        className={[
          "lyric-word group relative cursor-pointer rounded-md border px-2.5 py-1.5 pr-4 text-sm select-none text-nowrap",
          "bg-white border-slate-300 hover:bg-slate-200",
          isPlaybackIndex && "!border-amber-400 !bg-amber-200/80",
          isEditing && "border-purple-400 bg-purple-50/80 hover:bg-purple-100",
          isPendingCorrection &&
            "ring-2 ring-orange-500 font-bold bg-orange-100 border-orange-400",
          isTimed &&
            !isPendingCorrection &&
            "border-l-4 border-l-green-500 bg-green-50 hover:bg-green-100",
          isActive &&
            "ring-2 ring-blue-500 scale-105 font-bold bg-blue-100 border-blue-400",
        ].join(" ")}
        data-index={wordData.index}
        onClick={() => onClick(wordData.index)}
      >
        {wordData.name}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-2 py-1 bg-slate-800 text-white text-xs rounded-md whitespace-nowrap z-10">
          {isTimed
            ? `S: ${formatTimeValue(wordData.start)} E: ${formatTimeValue(
                wordData.end
              )}`
            : "Not timed"}
        </div>
      </div>
    );
  }
);

LyricWordComponent.displayName = "LyricWordComponent";

export default React.memo(LyricWordComponent, (prev, next) => {
  return (
    prev.wordData === next.wordData &&
    prev.editingLineIndex === next.editingLineIndex &&
    prev.lineIndex === next.lineIndex &&
    prev.onClick === next.onClick
  );
});
// ^^^^^^^^^^ สิ้นสุดจุดแก้ไข ^^^^^^^^^^