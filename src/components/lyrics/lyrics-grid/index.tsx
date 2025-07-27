// update/components/lyrics/lyrics-grid/index.tsx
import React, { useMemo, useRef, useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragMoveEvent,
} from "@dnd-kit/core";
import { useKaraokeStore } from "../../../stores/karaoke-store";
import { ChordEvent } from "../../../modules/midi-klyr-parser/lib/processor";
import LineRow from "./line-row";
import { LyricWordData, MusicMode, IMidiInfo } from "@/types/common.type";

export interface LyricsGridProps {
  lyricsData: LyricWordData[];
  currentIndex: number;
  isTimingActive: boolean;
  editingLineIndex: number | null;
  correctionIndex: number | null;
  playbackIndex: number | null;
  selectedLineIndex: number | null;
  onWordClick: (index: number) => void;
  onEditLine: (lineIndex: number) => void;
  onDeleteLine: (lineIndex: number) => void;
  onWordUpdate: (index: number, newWordData: Partial<LyricWordData>) => void;
  onWordDelete: (index: number) => void;
  onRulerClick: (
    lineIndex: number,
    tickPercentage: number,
    lineDuration: number
  ) => void;
  onChordClick: (chord: ChordEvent) => void;
  onAddChordClick: (lineIndex: number) => void;
  currentPlaybackTime: number | null | undefined;
  mode: MusicMode | null;
  midiInfo: IMidiInfo | null;
}

const LyricsGrid: React.FC<LyricsGridProps> = ({ lyricsData, ...props }) => {
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
        behavior: "instant",
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
};

export default LyricsGrid;
