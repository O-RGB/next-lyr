import React from "react";
import { ChordEvent } from "@/modules/midi-klyr-parser/lib/processor";
import { LyricWordData, MusicMode } from "@/types/common.type";
import Ruler from "./ruler/ruler";
import WordTimingLines from "./ruler/ruler-line";
import SelectedColorLine from "./render/selected-color";
import ChordsListLine from "./chords";
import LineAction from "./actions";
import LyricsWords from "./words";

export interface LineRowProps {
  line: LyricWordData[];
  lineIndex: number;
  chords: ChordEvent[];
  mode: MusicMode | null;
  lineRef: (el: HTMLDivElement | null) => void;
  onWordClick: (index: number) => void;
  onWordDelete: (index: number) => void;
}

const LineRow: React.FC<LineRowProps> = ({
  line,
  lineIndex,
  chords,
  mode,
  lineRef,
  onWordClick,
}) => {
  const rulerStartTime = line[0]?.start ?? null;
  const rulerEndTime = line[line.length - 1]?.end ?? null;
  const lineDuration =
    rulerEndTime !== null && rulerStartTime !== null
      ? rulerEndTime - rulerStartTime
      : 0;

  return (
    <div
      className="relative flex h-auto gap-3 py-3"
      ref={lineRef}
      data-line-index={lineIndex}
    >
      <SelectedColorLine lineIndex={lineIndex} />
      <div className="relative w-4 -my-3 flex items-center justify-center bg-gray-100 z-20">
        <div className="px-2 text-[9px]">{lineIndex + 1}</div>
      </div>
      <div className="relative flex flex-col gap-1 lg:gap-2 flex-1 min-w-0">
        <div className="relative w-[85%] h-4 hidden lg:block">
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
            />
          )}
          {rulerStartTime && (
            <ChordsListLine
              lineIndex={lineIndex}
              chords={chords}
              lineDuration={lineDuration}
              rulerStartTime={rulerStartTime}
            />
          )}
        </div>

        <div className="flex w-full justify-between items-center">
          <div className="flex-1 min-w-0 flex flex-nowrap gap-2 overflow-x-auto pb-2 w-full [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-slate-100 p-1">
            <LyricsWords
              line={line}
              lineIndex={lineIndex}
              onWordClick={onWordClick}
            ></LyricsWords>
          </div>

          <LineAction lineIndex={lineIndex} />
        </div>
      </div>
    </div>
  );
};

export default React.memo(LineRow);
