import { useMemo } from "react";
import { LyricWordData } from "../../types/type";
import LyricWord from "./lyric-word";
import { Card } from "../common/card";
import { Button } from "../common/button";
import { BiPencil, BiTrash } from "react-icons/bi";

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
        {lines.map((line, lineIndex) => (
          <Card
            key={lineIndex}
            data-line-index={lineIndex}
            className={[
              "flex items-center justify-between p-3 transition-all duration-200 hover:shadow-md",
              props.selectedLineIndex === lineIndex
                ? "bg-blue-100/80 ring-2 ring-blue-400"
                : "",
            ].join(" ")}
          >
            <div className="lyric-line flex flex-wrap gap-x-2 gap-y-1 leading-relaxed">
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
        ))}
      </div>
    </div>
  );
}
