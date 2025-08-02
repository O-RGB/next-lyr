import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { BiPencil, BiTrash } from "react-icons/bi";
import { BsPlusCircle } from "react-icons/bs";
import LyricWord from "./word";
import Ruler from "./ruler/ruler";
import WordTimingLines from "../../word-timing-lines";
import PopConfirmCommon from "../../../common/popconfrim";
import ButtonCommon from "../../../common/button";
import { LyricWordData, MusicMode, IMidiInfo } from "@/types/common.type";
import SelectedColorLine from "./render/selected-color";
import { useKaraokeStore } from "@/stores/karaoke-store";
import ChordsListLine from "./chords/lists";
import { ChordEvent } from "@/modules/midi-klyr-parser/lib/processor";
import LineAction from "./actions";

export interface LineRowProps {
  line: LyricWordData[];
  lineIndex: number;
  lineRef: (el: HTMLDivElement | null) => void;
  chords: ChordEvent[];
  mode: MusicMode | null;
  midiInfo: IMidiInfo | null;
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
}

const LineRow: React.FC<LineRowProps> = ({
  line,
  lineIndex,
  lineRef,
  chords,
  midiInfo,
  ...props
}) => {
  const editingLineIndex = useKaraokeStore((state) => state.editingLineIndex);

  const { setNodeRef } = useDroppable({
    id: `line-${lineIndex}`,
  });

  const firstWordOfLine = line[0];
  const lastWordOfLine = line[line.length - 1];
  const rulerStartTime = firstWordOfLine?.start ?? null;
  const rulerEndTime = lastWordOfLine?.end ?? null;
  const lineDuration =
    rulerEndTime !== null && rulerStartTime !== null
      ? rulerEndTime - rulerStartTime
      : 0;

  return (
    <div
      data-line-index={lineIndex}
      className={"relative flex flex-col gap-4 rounded-sm p-4 "}
    >
      <SelectedColorLine lineIndex={lineIndex}></SelectedColorLine>
      <div
        ref={(el: HTMLDivElement | null) => {
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
            props.onRulerClick(lineIndex, percentage, lineDuration)
          }
          mode={props.mode}
        />
        <WordTimingLines
          lineIndex={lineIndex}
          buttonProps={{
            onClick: () => props.onAddChordClick(lineIndex),
            disabled: editingLineIndex !== null,
            title: "Add New Chord to this Line",
            icon: (
              <BsPlusCircle className="text-xs text-purple-800"></BsPlusCircle>
            ),
          }}
          line={line}
          lineStartTime={rulerStartTime}
          lineEndTime={rulerEndTime}
          editingLineIndex={editingLineIndex}
        />
        <ChordsListLine
          chords={chords}
          lineDuration={lineDuration}
          onChordClick={props.onChordClick}
          rulerStartTime={rulerStartTime}
        ></ChordsListLine>
      </div>
      <div className="flex w-full justify-between items-center">
        <div className="flex flex-nowrap gap-2">
          {line.map((word) => (
            <LyricWord
              lineIndex={lineIndex}
              key={word.index}
              wordData={word}
              editingLineIndex={editingLineIndex}
              onClick={props.onWordClick}
              onUpdate={() => {}}
              onDelete={() => {}}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <LineAction lineIndex={lineIndex}></LineAction>
          {/* <ButtonCommon
            onClick={() => props.onEditLine(lineIndex)}
            disabled={editingLineIndex !== null}
            title="Start Timing Edit (Ctrl+Enter)"
            color="white"
            circle
            variant="ghost"
            size="sm"
            icon={<BiPencil className="text-slate-600" />}
            className="z-20"
          ></ButtonCommon>
          <PopConfirmCommon
            openbuttonProps={{
              disabled: editingLineIndex !== null,
              title: "Delete Line",
              icon: <BiTrash></BiTrash>,
              circle: true,
              color: "danger",
              variant: "ghost",
              size: "sm",
              className: "z-20",
            }}
            onConfirm={() => props.onDeleteLine(lineIndex)}
          ></PopConfirmCommon> */}
        </div>
      </div>
    </div>
  );
};
export default LineRow;
