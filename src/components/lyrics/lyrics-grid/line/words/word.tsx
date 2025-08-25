import React, { forwardRef, useEffect, useMemo } from "react";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { LyricWordData } from "@/types/common.type";

type WordProps = {
  wordData: LyricWordData;
  lineIndex: number;
  onClick: (index: number) => void;
  onUpdate: (index: number, newWordData: Partial<LyricWordData>) => void;
  onDelete: (index: number) => void;
  onSelect?: (index: number) => void;
  onActiveLine?: (bool: boolean) => void;
};

const Word = forwardRef<HTMLDivElement, WordProps>(
  ({ wordData, lineIndex, onClick, onSelect, onActiveLine }, ref) => {
    const baseClasses =
      "lyric-word group relative cursor-pointer rounded-md border px-2 lg:px-2.5 py-1 lg:py-1.5 pr-2 lg:pr-4 text-sm select-none text-nowrap bg-white border-slate-300 hover:bg-slate-200";

    const stateClasses = {
      playback: "!border-amber-400 !bg-amber-200/80",
      active:
        "outline  outline-blue-500 font-bold bg-blue-100 border-blue-400",
      pendingCorrection:
        "outline  outline-orange-500 font-bold bg-orange-100 border-orange-400",
      editing: "border-purple-400 bg-purple-50/80 hover:bg-purple-100",
      timed: "border-l-4 border-l-green-500 bg-green-50 hover:bg-green-100",
    };

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

    const shouldSelect = isPlayback || isActive || isEditing;

    const wordClasses = useMemo(() => {
      const classes = [baseClasses];

      if (!isCurrentLine) {
        if (isPlayback) {
          classes.push(stateClasses.playback);
        } else if (isTimed) {
          classes.push(stateClasses.timed);
        }
      } else {
        if (isPlayback) classes.push(stateClasses.playback);
        if (isActive) classes.push(stateClasses.active);
        if (isPendingCorrection) classes.push(stateClasses.pendingCorrection);
        if (isEditing) classes.push(stateClasses.editing);
        if (isTimed) classes.push(stateClasses.timed);
      }

      return classes.join(" ");
    }, [
      isCurrentLine,
      isPlayback,
      isActive,
      isPendingCorrection,
      isEditing,
      isTimed,
      baseClasses,
    ]);

    useEffect(() => {
      if (shouldSelect && onSelect) {
        onSelect(wordData.index);
      }
    }, [shouldSelect, onSelect, wordData.index]);

    useEffect(() => {
      onActiveLine?.(isCurrentLine);
    }, [isCurrentLine]);

    const formatTime = (value: number | null) => {
      if (value === null) return "N/A";
      return value > 1000 ? Math.round(value) : value.toFixed(2);
    };

    return (
      <div
        ref={ref}
        className={wordClasses}
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
  }
);

Word.displayName = "Word";

export default React.memo(Word);
