import React, { useMemo } from "react";
import ButtonCommon, { ButtonCommonProps } from "../common/button";
import { LyricWordData } from "@/types/common.type";
import { useKaraokeStore } from "@/stores/karaoke-store";

type WordWithState = LyricWordData & {
  isActive: boolean;
  isEditing: boolean;
  isPlaybackHighlight: boolean;
  isPendingCorrection: boolean;
};

type WordTimingLinesProps = {
  lineStartTime: number | null;
  lineEndTime: number | null;
  buttonProps: ButtonCommonProps;
  line: LyricWordData[];
  editingLineIndex: number | null;
  lineIndex: number;
};

function WordTimingLines({
  lineStartTime,
  lineEndTime,
  buttonProps,
  line,
  editingLineIndex,
  lineIndex,
}: WordTimingLinesProps) {
  if (!lineStartTime || !lineEndTime || lineEndTime === lineStartTime) {
    return null;
  }

  const totalLineDuration = lineEndTime - lineStartTime;
  if (totalLineDuration <= 0) return null;

  // ดึงค่า state จาก store มาใช้โดยตรง
  const currentIndex = useKaraokeStore((state) => state.currentIndex);
  const isTimingActive = useKaraokeStore((state) => state.isTimingActive);
  const correctionIndex = useKaraokeStore((state) => state.correctionIndex);
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex);
  const playbackIndex = useKaraokeStore((state) => state.playbackIndex);

  const words = useMemo<WordWithState[]>(() => {
    return line.map((word) => {
      // ใช้ค่า state ที่ดึงมา
      const isActive =
        currentIndex === word.index &&
        (isTimingActive || correctionIndex !== null) &&
        selectedLineIndex === lineIndex;

      return {
        ...word,
        isActive,
        isPendingCorrection: correctionIndex === word.index,
        isEditing: editingLineIndex === word.lineIndex && !isTimingActive,
        isPlaybackHighlight: playbackIndex === word.index,
      };
    });
    // เพิ่มค่า state เข้าไปใน dependency array
  }, [
    line,
    editingLineIndex,
    lineIndex,
    currentIndex,
    isTimingActive,
    correctionIndex,
    selectedLineIndex,
    playbackIndex,
  ]);

  const getColorClass = (word: WordWithState) => {
    if (word.isPendingCorrection) return "bg-orange-500";
    if (word.isActive) return "bg-blue-500";
    if (word.isEditing) return "bg-purple-400";
    if (word.isPlaybackHighlight) return "bg-amber-400";
    return "bg-green-500";
  };

  return (
    <div className="absolute w-full h-[1px] bottom-2.5 flex items-center opacity-70">
      {words.map((word) => {
        if (word.start === null || word.end === null) return null;

        const startPercentage =
          ((word.start - lineStartTime) / totalLineDuration) * 100;
        const endPercentage =
          ((word.end - lineStartTime) / totalLineDuration) * 100;

        const safeStartPercentage = Math.max(0, Math.min(100, startPercentage));
        const safeEndPercentage = Math.max(0, Math.min(100, endPercentage));
        const widthPercentage = Math.max(
          0.5,
          safeEndPercentage - safeStartPercentage
        );

        const colorClass = getColorClass(word);

        return (
          <div
            key={word.index}
            className="flex items-center absolute h-full px-1"
            style={{
              left: `${safeStartPercentage}%`,
              width: `${widthPercentage}%`,
            }}
          >
            <div
              className={`${colorClass} w-1.5 h-1.5 rounded-full`}
              title={`Word "${word.name}" Start: ${word.start}`}
            ></div>
            <div className={`flex-1 h-[1px] ${colorClass}`}></div>
            <div
              className={`${colorClass} w-1.5 h-1.5 rounded-full`}
              title={`Word "${word.name}" End: ${word.end}`}
            ></div>
          </div>
        );
      })}

      <div className="absolute -bottom-3 -right-7 z-50">
        <ButtonCommon
          {...buttonProps}
          circle
          size="sm"
          color="white"
          variant="ghost"
        />
      </div>
    </div>
  );
}

export default WordTimingLines;
