// update/components/lyrics/lyrics-grid.tsx
import { useMemo, useRef, useEffect } from "react";
import { LyricWordData } from "../../types/type";
import LyricWord from "./lyric-word";
import { Button } from "../common/button";
import { BiPencil, BiTrash } from "react-icons/bi";
import { useKaraokeStore } from "../../store/useKaraokeStore";
import Ruler from "../common/ruler";
import Tags from "../common/tags";
import React from "react";
import WordTimingLines from "./word-timing-lines";
import { ChordEvent } from "../../modules/midi-klyr-parser/lib/processor";

type Props = {
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
};

export default function LyricsGrid({
  lyricsData,
  onRulerClick,
  onChordClick,
  ...props
}: Props) {
  const chords = useKaraokeStore((s) => s.chordsData);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  const lines = useMemo(() => {
    if (!lyricsData || lyricsData.length === 0) return [];
    const groupedByLine: LyricWordData[][] = [];
    lyricsData.forEach((word) => {
      if (!groupedByLine[word.lineIndex]) {
        groupedByLine[word.lineIndex] = [];
      }
      groupedByLine[word.lineIndex].push(word);
    });

    // Sort words within each line by their original index to maintain order
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

  return (
    <div className="h-full bg-white border border-slate-300 rounded-lg p-3 overflow-auto">
      <div className="flex flex-col divide-y">
        {lines.map((line, lineIndex) => {
          const firstWordOfLine = line[0];
          const lastWordOfLine = line[line.length - 1];
          const rulerStartTime = firstWordOfLine?.start ?? null;
          const rulerEndTime = lastWordOfLine?.end ?? null;
          const lineDuration =
            rulerEndTime !== null && rulerStartTime !== null
              ? rulerEndTime - rulerStartTime
              : 0;

          const lineChords = chords
            .filter((chord) => {
              if (rulerStartTime === null) return false;
              const nextLine = lines[lineIndex + 1];
              const nextLineStartTime =
                nextLine && nextLine[0] && nextLine[0].start !== null
                  ? nextLine[0].start
                  : Infinity;

              return (
                chord.tick >= rulerStartTime && chord.tick < nextLineStartTime
              );
            })
            .sort((a, b) => a.tick - b.tick);

          // สร้าง wordsWithState สำหรับ WordTimingLines
          const wordsWithState = line.map((word) => ({
            ...word,
            isActive:
              (props.isTimingActive || props.correctionIndex !== null) &&
              props.currentIndex === word.index,
            isPendingCorrection: props.correctionIndex === word.index,
            isEditing:
              props.editingLineIndex === word.lineIndex &&
              !props.isTimingActive,
            isPlaybackHighlight: props.playbackIndex === word.index,
          }));

          return (
            <div
              key={lineIndex}
              ref={(el: any) => (lineRefs.current[lineIndex] = el)}
              data-line-index={lineIndex}
              className={[
                "relative pt-2 px-2 flex items-center justify-between rounded-sm",
                props.selectedLineIndex === lineIndex
                  ? "bg-blue-50/80 ring-2 ring-blue-400"
                  : "",
              ].join(" ")}
            >
              <div className="relative w-fit lyric-line flex flex-nowrap gap-x-2 gap-y-1 pt-8 pb-4 px-2">
                <div className="absolute w-full top-2">
                  <div className="w-full">
                    <Ruler
                      startTime={rulerStartTime}
                      endTime={rulerEndTime}
                      onRulerClick={(percentage) =>
                        onRulerClick(lineIndex, percentage, lineDuration)
                      }
                    />
                    <WordTimingLines
                      words={wordsWithState}
                      lineStartTime={rulerStartTime}
                      lineEndTime={rulerEndTime}
                    />
                  </div>

                  <div className="overflow-y-auto w-full">
                    {lineChords.length > 0 && (
                      <div className="absolute h-5 w-full -top-2 z-10">
                        {lineChords.map((chord, i) => {
                          const firstWordTick = rulerStartTime ?? 0;
                          const totalLineTick = lineDuration || 1;
                          const pos =
                            totalLineTick > 0
                              ? ((chord.tick - firstWordTick) / totalLineTick) *
                                100
                              : 0;

                          return (
                            <Tags
                              key={i}
                              style={{
                                left: `${Math.max(0, Math.min(100, pos))}%`,
                              }}
                              text={chord.chord}
                              className="absolute -top-1 cursor-pointer"
                              tagsClassName={"text-[10px]"}
                              hoverText={`Tick: ${chord.tick}`}
                              onClick={() => onChordClick(chord)}
                            ></Tags>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {line.map((word) => (
                  <LyricWord
                    key={word.index}
                    wordData={word}
                    isActive={
                      (props.isTimingActive ||
                        props.correctionIndex !== null) &&
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
          );
        })}
      </div>
    </div>
  );
}
