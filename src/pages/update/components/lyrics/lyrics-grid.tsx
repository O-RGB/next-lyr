import { useMemo, useRef, useEffect } from "react";
import { LyricWordData } from "../../types/type";
import LyricWord from "./lyric-word";
import { Card } from "../common/card";
import { Button } from "../common/button";
import { BiPencil, BiTrash } from "react-icons/bi";
import { useKaraokeStore } from "../../store/useKaraokeStore";

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
};

export default function LyricsGrid({ lyricsData, ...props }: Props) {
  const chords = useKaraokeStore((s) => s.chordsData);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]); // Ref for each line

  const lines = useMemo(() => {
    if (!lyricsData || lyricsData.length === 0) return [];
    const groupedByLine: LyricWordData[][] = [];
    lyricsData.forEach((word) => {
      if (!groupedByLine[word.lineIndex]) {
        groupedByLine[word.lineIndex] = [];
      }
      groupedByLine[word.lineIndex].push(word);
    });
    // Ensure refs array is the correct size
    lineRefs.current = lineRefs.current.slice(0, groupedByLine.length);
    return groupedByLine;
  }, [lyricsData]);

  // Effect for auto-scrolling
  useEffect(() => {
    if (
      props.selectedLineIndex !== null &&
      lineRefs.current[props.selectedLineIndex]
    ) {
      lineRefs.current[props.selectedLineIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center", // Scrolls the line to the center of the view
      });
    }
  }, [props.selectedLineIndex]); // Reruns whenever the selected line changes

  return (
    <div className="flex-grow bg-slate-200/50 border border-slate-300 rounded-lg p-3 overflow-y-auto">
      <div className="flex flex-col gap-3">
        {lines.map((line, lineIndex) => {
          const lineChords = chords.filter((chord) => {
            const firstWord = line[0];
            if (!firstWord || firstWord.start === null) return false;
            const lineStartTime = firstWord.start;
            const nextLine = lines[lineIndex + 1];
            const nextLineStartTime =
              nextLine && nextLine[0] && nextLine[0].start !== null
                ? nextLine[0].start
                : Infinity;

            return (
              chord.tick >= lineStartTime && chord.tick < nextLineStartTime
            );
          });
          return (
            <Card
              key={lineIndex}
              // Assign the ref to each line's wrapping Card component
              ref={(el: any) => (lineRefs.current[lineIndex] = el)}
              data-line-index={lineIndex}
              className={[
                "relative pt-6 flex items-center justify-between p-3 transition-all duration-200 hover:shadow-md",
                props.selectedLineIndex === lineIndex
                  ? "bg-blue-100/80 ring-2 ring-blue-400"
                  : "",
              ].join(" ")}
            >
              {lineChords.length > 0 && (
                // *** FIX APPLIED HERE ***
                <div className="absolute top-1 left-2 right-[6.5rem] h-5">
                  {lineChords.map((chord, i) => {
                    const firstWordTick = line[0].start ?? 0;
                    const lastWord = line[line.length - 1];
                    const lastWordTick = lastWord.end ?? firstWordTick;
                    const totalLineTick = lastWordTick - firstWordTick || 1;
                    const pos =
                      totalLineTick > 0
                        ? ((chord.tick - firstWordTick) / totalLineTick) * 100
                        : 0;

                    return (
                      <span
                        key={i}
                        className="absolute text-purple-600 font-bold text-sm"
                        style={{ left: `${Math.max(0, Math.min(100, pos))}%` }}
                      >
                        {chord.chord}
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="lyric-line flex flex-wrap gap-x-2 gap-y-1 leading-relaxed">
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
            </Card>
          );
        })}
      </div>
    </div>
  );
}
