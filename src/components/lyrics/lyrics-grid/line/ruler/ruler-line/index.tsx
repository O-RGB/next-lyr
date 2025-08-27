import React from "react";
import { LyricWordData } from "@/types/common.type";
import RulerLineWord from "./word-line";

type WordTimingLinesProps = {
  lineStartTime: number;
  lineEndTime: number;
  line: LyricWordData[];
  lineIndex: number;
  isSelected: boolean;
};

function WordTimingLines({
  lineStartTime,
  lineEndTime,
  line,
  lineIndex,
  isSelected,
}: WordTimingLinesProps) {
  const totalLineDuration = lineEndTime - lineStartTime;
  if (totalLineDuration <= 0) return null;

  const getWordPosition = (word: LyricWordData) => {
    if (word.start === null || word.end === null) return null;

    const startPercent =
      ((word.start - lineStartTime) / totalLineDuration) * 100;
    const endPercent = ((word.end - lineStartTime) / totalLineDuration) * 100;
    const safeStart = Math.max(0, Math.min(100, startPercent));
    const safeEnd = Math.max(0, Math.min(100, endPercent));

    return { left: safeStart, width: Math.max(0.5, safeEnd - safeStart) };
  };

  return (
    <div className="absolute w-full h-[1px] bottom-2.5 flex items-center opacity-70">
      {line.map((word) => {
        const position = getWordPosition(word);
        if (position)
          return (
            <RulerLineWord
              key={word.index}
              word={word}
              position={position}
              lineIndex={lineIndex}
              isSelected={isSelected}
            />
          );
      })}
    </div>
  );
}

export default React.memo(WordTimingLines);
