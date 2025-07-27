import React, { useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { IMidiInfo, LyricWordData, MusicMode } from "../../../types/type";
import { BiPencil, BiTrash } from "react-icons/bi";
import { BsPlusCircle } from "react-icons/bs";
import { ChordEvent } from "@/pages/update/lib/midi-tags-decode";
import LyricWord from "../lyric-word";
import Ruler from "../../common/ruler";
import WordTimingLines from "../word-timing-lines";
import DraggableChordTag from "./draggable-chord-tag";
import PopConfirmCommon from "../../common/popconfrim";
import ButtonCommon from "../../common/button";

export interface LineRowProps {
  line: LyricWordData[];
  lineIndex: number;
  lineRef: (el: HTMLDivElement | null) => void;
  chords: ChordEvent[];
  selectedLineIndex: number | null;
  currentPlaybackTime: number | null | undefined;
  mode: MusicMode | null;
  isTimingActive: boolean;
  correctionIndex: number | null;
  currentIndex: number;
  editingLineIndex: number | null;
  playbackIndex: number | null;
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

  let currentPlaybackPercentage: number | null = null;
  if (
    props.currentPlaybackTime !== null &&
    rulerStartTime !== null &&
    rulerEndTime !== null &&
    lineDuration > 0 &&
    (props.currentPlaybackTime ?? 0) >= rulerStartTime &&
    (props.currentPlaybackTime ?? 0) <= rulerEndTime
  ) {
    currentPlaybackPercentage =
      (((props.currentPlaybackTime ?? 0) - rulerStartTime) / lineDuration) *
      100;
  }

  const wordsWithState = line.map((word) => ({
    ...word,
    isActive:
      (props.isTimingActive || props.correctionIndex !== null) &&
      props.currentIndex === word.index,
    isPendingCorrection: props.correctionIndex === word.index,
    isEditing:
      props.editingLineIndex === word.lineIndex && !props.isTimingActive,
    isPlaybackHighlight: props.playbackIndex === word.index,
  }));
  useEffect(() => {}, []);
  return (
    <div
      data-line-index={lineIndex}
      className={[
        "relative flex flex-col gap-4 rounded-sm p-4",
        props.selectedLineIndex === lineIndex ? "bg-blue-50" : "",
      ].join(" ")}
    >
      <div
        ref={(el: HTMLDivElement | null) => {
          lineRef(el);
          setNodeRef(el);
        }}
        className="relative w-[80%] h-4"
      >
        <Ruler
          startTime={rulerStartTime}
          endTime={rulerEndTime}
          onRulerClick={(percentage) =>
            props.onRulerClick(lineIndex, percentage, lineDuration)
          }
          currentPlaybackPercentage={currentPlaybackPercentage}
          mode={props.mode}
        />

        <WordTimingLines
          buttonProps={{
            // hidden: isLineActive,
            onClick: () => props.onAddChordClick(lineIndex),
            disabled: props.editingLineIndex !== null,
            title: "Add New Chord to this Line",
            icon: (
              <BsPlusCircle className="text-xs text-gray-500"></BsPlusCircle>
            ),
          }}
          words={wordsWithState}
          lineStartTime={rulerStartTime}
          lineEndTime={rulerEndTime}
        />
        {chords.length > 0 && (
          <div className="absolute h-5 w-full -top-2 z-50">
            {chords.map((chord, i) => {
              const firstWordTick = rulerStartTime ?? 0;
              const totalLineTick = lineDuration || 1;
              const pos =
                totalLineTick > 0
                  ? ((chord.tick - firstWordTick) / totalLineTick) * 100
                  : 0;
              return (
                <DraggableChordTag
                  key={`${chord.tick}-${i}`}
                  chord={chord}
                  initialLeftPercentage={pos}
                  onClick={() => props.onChordClick(chord)}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="flex w-full justify-between items-center">
        <div className="flex flex-nowrap gap-2">
          {line.map((word) => (
            <LyricWord
              key={word.index}
              wordData={word}
              isActive={
                (props.isTimingActive || props.correctionIndex !== null) &&
                props.currentIndex === word.index
              }
              isPendingCorrection={props.correctionIndex === word.index}
              isEditing={
                props.editingLineIndex === word.lineIndex &&
                !props.isTimingActive
              }
              isPlaybackHighlight={props.playbackIndex === word.index}
              onClick={props.onWordClick}
              onUpdate={() => {}}
              onDelete={() => {}}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <ButtonCommon
            onClick={() => props.onEditLine(lineIndex)}
            disabled={props.editingLineIndex !== null}
            title="Start Timing Edit (Ctrl+Enter)"
            color="white"
            circle
            variant="ghost"
            size="sm"
            icon={<BiPencil className="text-slate-600" />}
          ></ButtonCommon>
          <PopConfirmCommon
            openbuttonProps={{
              disabled: props.editingLineIndex !== null,
              title: "Delete Line",
              icon: <BiTrash></BiTrash>,
              circle: true,
              color: "danger",
              variant: "ghost",
              size: "sm",
            }}
            onConfirm={() => props.onDeleteLine(lineIndex)}
          ></PopConfirmCommon>
        </div>
      </div>
    </div>
  );
};
export default LineRow;
