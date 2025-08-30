import React from "react";
import SelectedColorLine from "./render/selected-color";
import LineAction from "./actions";
import LyricsWords from "./words";
import { LyricWordData, MusicMode } from "@/types/common.type";
import { useKaraokeStore } from "@/stores/karaoke-store";

export interface LineRowProps {
  line: LyricWordData[];
  lineIndex: number;
  lineRef?: (el: HTMLDivElement | null) => void;
  onWordClick: (index: number) => void;
}

const LineRow: React.FC<LineRowProps> = ({
  line,
  lineIndex,
  lineRef,
  onWordClick,
}) => {
  // const rulerStartTime = line[0]?.start ?? null;
  // const rulerEndTime = line[line.length - 1]?.end ?? null;

  return (
    <div
      className="relative flex h-full w-full gap-2 lg:gap-3  "
      ref={lineRef}
      data-line-index={lineIndex}
    >
      <SelectedColorLine lineIndex={lineIndex} />
      <div className="relative w-4 h-full flex items-center justify-center bg-gray-100 z-20">
        <div className="px-2 text-[9px]">{lineIndex + 1}</div>
      </div>
      <div className="relative flex flex-col items-center justify-center gap-1 lg:gap-2 flex-1 min-w-0">
        {/* <div className="relative w-[85%] h-4 hidden lg:block">
          {rulerStartTime && rulerEndTime && (
            <Ruler
              lineIndex={lineIndex}
              startTime={rulerStartTime}
              endTime={rulerEndTime}
              mode={mode}
            />
          )}
          {rulerStartTime && rulerEndTime && (
            <WordTimingLines
              lineIndex={lineIndex}
              line={line}
              lineStartTime={rulerStartTime}
              lineEndTime={rulerEndTime}
              isSelected={isSelected}
            />
          )}
        </div> */}

        <div className="flex w-full justify-between items-center">
          <LyricsWords
            line={line}
            // lineIndex={lineIndex}
            onWordClick={onWordClick}
            // isSelected={isSelected}
          />

          <LineAction lineIndex={lineIndex} />
        </div>
      </div>
    </div>
  );
};

export default React.memo(LineRow);
