import React, { useMemo, useRef, useEffect, useState } from "react";
import { LyricWordData } from "../../types/type";
import LyricWord from "./lyric-word";
import { Button } from "../common/button";
import { BiPencil, BiTrash } from "react-icons/bi";
import { BsPlusCircle } from "react-icons/bs";
import { useKaraokeStore } from "../../store/useKaraokeStore";
import Ruler from "../common/ruler";
import Tags from "../common/tags";
import WordTimingLines from "./word-timing-lines";
import { ChordEvent } from "../../modules/midi-klyr-parser/lib/processor";
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragMoveEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

const DraggableChordTag = ({
  chord,
  initialLeftPercentage,
  onClick,
}: {
  chord: ChordEvent;
  initialLeftPercentage: number;
  onClick: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `chord-${chord.tick}`,
      data: { chord },
    });

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${initialLeftPercentage}%`,
    top: "-0.65rem",
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : 10,
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
    >
      <Tags
        disabledTooltip={isDragging}
        text={chord.chord}
        className="cursor-grab"
        tagsClassName={"text-[8px]"}
        hoverText={`Tick: ${chord.tick}`}
      />
    </div>
  );
};

const LineRow = ({
  line,
  lineIndex,
  lineRef,
  chords,
  ...props
}: {
  line: LyricWordData[];
  lineIndex: number;
  lineRef: (el: HTMLDivElement | null) => void;
  chords: ChordEvent[];
  [key: string]: any;
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
    props.currentPlaybackTime !== undefined &&
    rulerStartTime !== null &&
    rulerEndTime !== null &&
    lineDuration > 0 &&
    props.currentPlaybackTime >= rulerStartTime &&
    props.currentPlaybackTime <= rulerEndTime
  ) {
    currentPlaybackPercentage =
      ((props.currentPlaybackTime - rulerStartTime) / lineDuration) * 100;
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
        <div className="absolute -bottom-1 -right-5 z-50">
          <Button
            onClick={() => props.onAddChordClick(lineIndex)}
            disabled={props.editingLineIndex !== null}
            className="p-2 hover:bg-green-200 rounded-md"
            title="Add New Chord to this Line"
          >
            <BsPlusCircle className="h-3 w-3 text-gray-500" />
          </Button>
        </div>
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
          <Button
            onClick={() => props.onEditLine(lineIndex)}
            disabled={props.editingLineIndex !== null}
            className="p-2 hover:bg-slate-200 rounded-md"
            title="Start Timing Edit (Ctrl+Enter)"
          >
            <BiPencil className="h-5 w-5 text-slate-600" />
          </Button>
          <Button
            onClick={() => props.onDeleteLine(lineIndex)}
            disabled={props.editingLineIndex !== null}
            className="p-2 hover:bg-red-200 rounded-md"
            title="Delete Line"
          >
            <BiTrash className="h-5 w-5 text-red-600" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function LyricsGrid({ lyricsData, ...props }: any) {
  const { chordsData: chords, actions } = useKaraokeStore();
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [draggingChord, setDraggingChord] = useState<{
    tick: number;
    x: number;
    y: number;
  } | null>(null);

  const lines = useMemo(() => {
    if (!lyricsData || lyricsData.length === 0) return [];
    const groupedByLine: LyricWordData[][] = [];
    lyricsData.forEach((word: LyricWordData) => {
      if (!groupedByLine[word.lineIndex]) {
        groupedByLine[word.lineIndex] = [];
      }
      groupedByLine[word.lineIndex].push(word);
    });
    groupedByLine.forEach((line) => line.sort((a, b) => a.index - b.index));
    lineRefs.current = lineRefs.current.slice(0, groupedByLine.length);
    return groupedByLine;
  }, [lyricsData]);

  useEffect(() => {
    if (
      props.selectedLineIndex !== null &&
      lineRefs.current[props.selectedLineIndex]
    ) {
      lineRefs.current[props.selectedLineIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [props.selectedLineIndex]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, over, delta } = event;
    if (!over || !active.data.current) return;

    const chord = active.data.current.chord as ChordEvent;
    const targetLineId = over.id.toString();
    if (!targetLineId.startsWith("line-")) return;

    const targetLineIndex = parseInt(targetLineId.split("-")[1]);
    const targetLineRef = lineRefs.current[targetLineIndex];
    if (!targetLineRef) return;

    const lineRect = targetLineRef.getBoundingClientRect();
    const dropPositionX = active.rect.current.initial!.left + delta.x;
    const relativeX = dropPositionX - lineRect.left;

    const lineWords = lines[targetLineIndex];
    const lineStartTime = lineWords[0]?.start;
    const lineEndTime = lineWords[lineWords.length - 1]?.end;
    if (lineStartTime === null || lineEndTime === null) return;

    const lineDuration = lineEndTime - lineStartTime;
    const percentage = Math.max(0, Math.min(1, relativeX / lineRect.width));
    const previewTick = Math.round(lineStartTime + percentage * lineDuration);

    setDraggingChord({
      tick: previewTick,
      x: dropPositionX,
      y: lineRect.top - 20,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingChord(null);

    const { active, over, delta } = event;
    if (!over || !active.data.current) return;

    const originalChord = active.data.current.chord as ChordEvent;
    const targetLineId = over.id.toString();
    if (!targetLineId.startsWith("line-")) return;

    const targetLineIndex = parseInt(targetLineId.split("-")[1]);
    const targetLineRef = lineRefs.current[targetLineIndex];
    if (!targetLineRef) return;

    const lineRect = targetLineRef.getBoundingClientRect();
    const dropPositionX = active.rect.current.initial!.left + delta.x;
    const relativeX = dropPositionX - lineRect.left;

    const lineWords = lines[targetLineIndex];
    const lineStartTime = lineWords[0]?.start;
    const lineEndTime = lineWords[lineWords.length - 1]?.end;

    if (lineStartTime === null || lineEndTime === null) return;
    const lineDuration = lineEndTime - lineStartTime;
    if (lineDuration <= 0) {
      actions.updateChord(originalChord.tick, {
        ...originalChord,
        tick: lineStartTime,
      });
      return;
    }

    const percentage = Math.max(0, Math.min(1, relativeX / lineRect.width));
    const newTick = Math.round(lineStartTime + percentage * lineDuration);
    actions.updateChord(originalChord.tick, {
      ...originalChord,
      tick: newTick,
    });
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <div className="h-full bg-white border border-slate-300 rounded-lg p-3 overflow-auto">
          <div className="flex flex-col divide-y">
            {lines.map((line, lineIndex) => {
              const lineChords = chords.filter((chord: ChordEvent) => {
                const rulerStartTime = line[0]?.start;
                if (rulerStartTime === null) return false;
                const nextLine = lines[lineIndex + 1];
                const nextLineStartTime =
                  nextLine && nextLine[0]?.start !== null
                    ? nextLine[0].start
                    : Infinity;
                return (
                  chord.tick >= rulerStartTime && chord.tick < nextLineStartTime
                );
              });

              return (
                <LineRow
                  key={lineIndex}
                  line={line}
                  lineIndex={lineIndex}
                  lineRef={(el) => (lineRefs.current[lineIndex] = el)}
                  chords={lineChords}
                  {...props}
                />
              );
            })}
          </div>
        </div>
      </DndContext>

      {draggingChord && (
        <div
          style={{
            position: "fixed",
            top: draggingChord.y,
            left: draggingChord.x,
            backgroundColor: "rgba(0,0,0,0.75)",
            color: "#fff",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "10px",
            pointerEvents: "none",
            transform: "translate(-50%, -100%)",
            whiteSpace: "nowrap",
            zIndex: 9999,
          }}
        >
          Tick: {draggingChord.tick}
        </div>
      )}
    </>
  );
}
