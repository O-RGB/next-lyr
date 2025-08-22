import React, { forwardRef } from "react";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { LyricWordData } from "@/types/common.type";

type LyricWordsProps = {
  wordData: LyricWordData;
  lineIndex: number;
  onClick: (index: number) => void;
  onUpdate: (index: number, newWordData: Partial<LyricWordData>) => void;
  onDelete: (index: number) => void;
};

const LyricWords = forwardRef<HTMLDivElement, LyricWordsProps>(
  ({ wordData, lineIndex, onClick }, ref) => {
    let classes =
      "lyric-word group relative cursor-pointer rounded-md border px-2.5 py-1.5 pr-4 text-sm select-none text-nowrap bg-white border-slate-300 hover:bg-slate-200";
    let wordIsPlayback = "!border-amber-400 !bg-amber-200/80";
    let wordIsActive =
      "ring-2 ring-blue-500 scale-105 font-bold bg-blue-100 border-blue-400";
    let wordIsPendingCorrection =
      "ring-2 ring-orange-500 font-bold bg-orange-100 border-orange-400";
    let wordIsEditing = "border-purple-400 bg-purple-50/80 hover:bg-purple-100";
    let wordIsTimed =
      "border-l-4 border-l-green-500 bg-green-50 hover:bg-green-100";

    const isCurrentLine = useKaraokeStore(
      (state) => state.selectedLineIndex === lineIndex
    );
    const isPlayback = useKaraokeStore(
      (state) => state.playbackIndex === wordData.index
    );

    const currentIndex = useKaraokeStore((state) => state.currentIndex);
    const isTimingActive = useKaraokeStore((state) => state.isTimingActive);
    const correctionIndex = useKaraokeStore((state) => state.correctionIndex);
    const editingLineIndex = useKaraokeStore((state) => state.editingLineIndex);

    const isActive =
      isCurrentLine &&
      currentIndex === wordData.index &&
      (isTimingActive || correctionIndex !== null);
    const isEditing =
      isCurrentLine &&
      editingLineIndex === wordData.lineIndex &&
      !isTimingActive;
    const isPendingCorrection = correctionIndex === wordData.index;
    const isTimed = wordData.start !== null;

    const getWordClasses = () => {
      let color = [];
      if (isPlayback) color.push(wordIsPlayback);
      if (isActive) color.push(wordIsActive);
      if (isPendingCorrection) color.push(wordIsPendingCorrection);
      if (isEditing) color.push(wordIsEditing);
      if (isTimed) color.push(wordIsTimed);
      return color;
    };

    const formatTime = (value: number | null) => {
      if (value === null) return "N/A";
      return value > 1000 ? Math.round(value) : value.toFixed(2);
    };

    const renderWord = (wordStyle: string[] = []) => (
      <div
        ref={ref}
        className={[classes, ...wordStyle].join(" ")}
        data-index={wordData.index}
        onClick={() => onClick(wordData.index)}
      >
        {wordData.name}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-2 py-1 bg-slate-800 text-white text-xs rounded-md whitespace-nowrap z-10">
          {wordData.start !== null
            ? `Start: ${formatTime(wordData.start)} | End: ${formatTime(
                wordData.end
              )}`
            : "Not timed yet"}
        </div>
      </div>
    );

    if (!isCurrentLine)
      if (isPlayback) {
        return renderWord(getWordClasses());
      } else {
        return renderWord(wordData.start ? [wordIsTimed] : []);
      }

    return renderWord(getWordClasses());
  }
);

export default React.memo(LyricWords);
