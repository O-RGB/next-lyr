// src/components/lyrics/lyrics-grid/line/index.tsx
import React from "react";
import LyricWord from "./word";
import Ruler from "./ruler/ruler";
import WordTimingLines from "../../word-timing-lines";
import SelectedColorLine from "./render/selected-color";
import ChordsListLine from "./chords/lists";
import LineAction from "./actions";
import { useDroppable } from "@dnd-kit/core";
import { BsPlusCircle } from "react-icons/bs";
import { LyricWordData, MusicMode } from "@/types/common.type";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { ChordEvent } from "@/modules/midi-klyr-parser/lib/processor";

export interface LineRowProps {
  line: LyricWordData[];
  lineIndex: number;
  lineRef: (el: HTMLDivElement | null) => void;
  // vvvvvvvvvv จุดแก้ไข vvvvvvvvvv
  setWordRef: (el: HTMLDivElement | null, index: number) => void;
  // ^^^^^^^^^^ สิ้นสุดจุดแก้ไข ^^^^^^^^^^
  chords: ChordEvent[];
  mode: MusicMode | null;
  onRulerClick: (
    lineIndex: number,
    percentage: number,
    lineDuration: number
  ) => void;
  onChordClick: (chord: ChordEvent) => void;
  onAddChordClick: (lineIndex: number) => void;
  onWordClick: (index: number) => void;
  onEditLine: (lineIndex: number) => void;
  onDeleteLine: (lineIndex: number) => void;
  onWordUpdate: (index: number, newWordData: Partial<LyricWordData>) => void;
  onWordDelete: (index: number) => void;
}

const LineRow: React.FC<LineRowProps> = React.memo(
  ({
    line,
    lineIndex,
    lineRef,
    setWordRef, // vvvvvvvvvv จุดแก้ไข vvvvvvvvvv
    chords,
    mode,
    onRulerClick,
    onChordClick,
    onAddChordClick,
    onWordClick,
    onEditLine,
    onDeleteLine,
  }) => {
    const editingLineIndex = useKaraokeStore((state) => state.editingLineIndex);

    const { setNodeRef } = useDroppable({ id: `line-${lineIndex}` });

    const rulerStartTime = line[0]?.start ?? null;
    const rulerEndTime = line[line.length - 1]?.end ?? null;
    const lineDuration =
      rulerEndTime !== null && rulerStartTime !== null
        ? rulerEndTime - rulerStartTime
        : 0;

    return (
      <div
        data-line-index={lineIndex}
        className="relative flex flex-col gap-4 rounded-sm p-4"
      >
        <SelectedColorLine lineIndex={lineIndex} />
        <div
          ref={(el) => {
            lineRef(el);
            setNodeRef(el);
          }}
          className="relative w-[80%] h-4"
        >
          <Ruler
            lineIndex={lineIndex}
            startTime={rulerStartTime}
            endTime={rulerEndTime}
            onRulerClick={(percentage) =>
              onRulerClick(lineIndex, percentage, lineDuration)
            }
            mode={mode}
          />
          <WordTimingLines
            lineIndex={lineIndex}
            buttonProps={{
              onClick: () => onAddChordClick(lineIndex),
              disabled: editingLineIndex !== null,
              title: "Add New Chord to this Line",
              icon: <BsPlusCircle className="text-xs text-purple-800" />,
            }}
            line={line}
            lineStartTime={rulerStartTime}
            lineEndTime={rulerEndTime}
            editingLineIndex={editingLineIndex}
          />
          <ChordsListLine
            chords={chords}
            lineDuration={lineDuration}
            onChordClick={onChordClick}
            rulerStartTime={rulerStartTime}
          />
        </div>
        <div className="flex w-full justify-between items-center">
          <div className="flex-1 flex flex-nowrap gap-2 overflow-x-auto pb-2 w-full [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-slate-100 p-1">
            {line.map((word) => (
              <LyricWord
                ref={(el) => setWordRef(el, word.index)}
                key={word.index}
                lineIndex={lineIndex}
                wordData={word}
                editingLineIndex={editingLineIndex}
                onClick={onWordClick}
                onUpdate={() => {}}
                onDelete={() => {}}
              />
            ))}
          </div>

          <LineAction
            editingLineIndex={editingLineIndex ?? undefined}
            lineIndex={lineIndex}
            onDeleteLine={onDeleteLine}
            onEditLine={onEditLine}
          />
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.line === next.line &&
    prev.chords === next.chords &&
    prev.lineIndex === next.lineIndex &&
    prev.mode === next.mode
);

LineRow.displayName = "LineRow";
export default LineRow;
