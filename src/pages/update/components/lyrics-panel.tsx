import type { RefObject } from "react";
import { LyricWordData } from "../lib/type";
import { Button } from "./common/button";
import { Card } from "./common/card";
import LyricsGrid from "./lyrics-grid";
import { BsPlay, BsSave } from "react-icons/bs";
import { BiStop } from "react-icons/bi";

type Props = {
  lyricsData: LyricWordData[];
  currentIndex: number;
  isTimingActive: boolean;
  editingLineIndex: number | null;
  correctionIndex: number | null; // <-- PROP ใหม่
  playbackIndex: number | null;
  lyricInputRef: RefObject<HTMLTextAreaElement | null>;
  onImport: () => void;
  onWordClick: (index: number) => void;
  onEditLine: (lineIndex: number) => void;
  onWordUpdate: (index: number, newWordData: Partial<LyricWordData>) => void;
  onWordDelete: (index: number) => void;
  onPreview: () => void;
  onExport: () => void;
  onStopTiming: () => void;
};

export default function LyricsPanel({ ...props }: Props) {
  return (
    <Card className="flex-[3] flex flex-col p-4">
      <h3 className="text-lg font-semibold mb-2">Lyric Grid</h3>
      <LyricsGrid
        lyricsData={props.lyricsData}
        currentIndex={props.currentIndex}
        isTimingActive={props.isTimingActive}
        editingLineIndex={props.editingLineIndex}
        correctionIndex={props.correctionIndex} // <-- ส่งต่อไป
        playbackIndex={props.playbackIndex}
        onWordClick={props.onWordClick}
        onEditLine={props.onEditLine}
        onWordUpdate={props.onWordUpdate}
        onWordDelete={props.onWordDelete}
      />
      <div className="flex items-center gap-2 mt-4 flex-wrap">
        <Button onClick={props.onPreview}>
          <BsPlay className="mr-2 h-4 w-4" /> Preview
        </Button>
        <Button onClick={props.onExport}>
          <BsSave className="mr-2 h-4 w-4" /> Export JSON
        </Button>

        {props.editingLineIndex !== null && (
          <Button
            onClick={props.onStopTiming}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <BiStop className="mr-2 h-4 w-4" /> Stop Edit
          </Button>
        )}
      </div>
      <hr className="my-4 border-slate-300" />
      <h3 className="text-lg font-semibold mb-2">Import Lyrics</h3>
      <textarea
        ref={props.lyricInputRef}
        placeholder="Paste lyrics here... Use new lines, spaces, or | to separate words."
        className="min-h-[100px]"
      />
      <Button onClick={props.onImport} className="mt-2 w-full">
        Process Lyrics
      </Button>
    </Card>
  );
}
