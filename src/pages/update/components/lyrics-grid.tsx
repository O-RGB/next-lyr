import { useMemo } from "react";
import { LyricWordData } from "../lib/type";
import LyricWord from "./lyric-word";
import { Card } from "./common/card";
import { Button } from "./common/button";
import { BiPencil } from "react-icons/bi";

type Props = {
  lyricsData: LyricWordData[];
  currentIndex: number;
  isTimingActive: boolean;
  editingLineIndex: number | null;
  correctionIndex: number | null; // <-- PROP ใหม่
  playbackIndex: number | null;
  onWordClick: (index: number) => void;
  onEditLine: (lineIndex: number) => void;
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
            className="flex items-center justify-between p-3 transition-shadow hover:shadow-md"
          >
            <div className="lyric-line flex flex-wrap gap-x-2 gap-y-1 leading-relaxed">
              {line.map((word) => (
                <LyricWord
                  key={word.index}
                  wordData={word}
                  isActive={
                    props.isTimingActive && props.currentIndex === word.index
                  }
                  isPendingCorrection={props.correctionIndex === word.index} // <-- ส่ง PROP ใหม่ลงไป
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
            <Button
              className="ml-4"
              onClick={() => props.onEditLine(lineIndex)}
              disabled={props.isTimingActive}
            >
              <BiPencil className="h-4 w-4" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
