import { useMemo } from "react";
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
  const lines = useMemo(() => {
    if (!lyricsData || lyricsData.length === 0) return [];

    const groupedByLine: LyricWordData[][] = [];
    lyricsData.forEach((word) => {
      if (!groupedByLine[word.lineIndex]) {
        groupedByLine[word.lineIndex] = [];
      }
      groupedByLine[word.lineIndex].push(word);
    });
    return groupedByLine;
  }, [lyricsData]);

  return (
    <div className="flex-grow bg-slate-200/50 border border-slate-300 rounded-lg p-3 overflow-y-auto">
      <div className="flex flex-col gap-3">
        {lines.map((line, lineIndex) => {
          const lineChords = chords.filter((chord) => {
            const firstWord = line[0];
            if (!firstWord || firstWord.start === null) return false;
            const lastWord = line[line.length - 1];
            if (!lastWord || lastWord.end === null) return false;

            const lineStartTime = firstWord.start;
            const nextLineStartTime =
              lines[lineIndex + 1] && lines[lineIndex + 1][0].start
                ? lines[lineIndex + 1][0].start
                : Infinity;

            return (
              chord.tick >= lineStartTime &&
              chord.tick < (nextLineStartTime ?? 0)
            );
          });
          return (
            <Card
              key={lineIndex}
              data-line-index={lineIndex}
              className={[
                "relative pt-6 flex items-center justify-between p-3 transition-all duration-200 hover:shadow-md",
                props.selectedLineIndex === lineIndex
                  ? "bg-blue-100/80 ring-2 ring-blue-400"
                  : "",
              ].join(" ")}
            >
              {lineChords.length > 0 && (
                <div className="absolute top-1 left-2 w-full h-5">
                  {lineChords.map((chord, i) => {
                    const firstWordTick = line[0].start ?? 0;
                    const lastWordTick =
                      line[line.length - 1].end ?? firstWordTick;
                    const totalLineTick = lastWordTick - firstWordTick || 1;
                    const pos =
                      ((chord.tick - firstWordTick) / totalLineTick) * 100;
                    return (
                      <span
                        key={i}
                        className="absolute text-purple-600 font-bold text-sm"
                        style={{ left: `${pos}%` }}
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
                  disabled={props.isTimingActive}
                  className="p-2 hover:bg-slate-200 rounded-md"
                  title="Start Timing Edit"
                >
                  <BiPencil className="h-5 w-5 text-slate-600" />
                </Button>
                <Button
                  onClick={() => props.onDeleteLine(lineIndex)}
                  disabled={props.isTimingActive}
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
