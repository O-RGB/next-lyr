// update/components/panel/lyrics-panel.tsx
import { useRef } from "react";
import { useKaraokeStore } from "../../store/useKaraokeStore";
import { Button } from "../common/button";
import { Card } from "../common/card";
import LyricsGrid from "../lyrics/lyrics-grid";
import { BsPlay, BsSave } from "react-icons/bs";
import { BiStop } from "react-icons/bi";
import { ChordEvent } from "../../modules/midi-klyr-parser/lib/processor"; // Import ChordEvent type

type Props = {
  // Props are now for events that the parent needs to handle
  onWordClick: (index: number) => void;
  onEditLine: (lineIndex: number) => void;
  onStopTiming: () => void;
  onRulerClick: (
    lineIndex: number,
    tickPercentage: number,
    lineDuration: number
  ) => void; // New prop
  onChordClick: (chord: ChordEvent) => void; // New prop
  onAddChordClick: (lineIndex: number) => void; // New prop
};

export default function LyricsPanel({
  onWordClick,
  onEditLine,
  onStopTiming,
  onRulerClick,
  onChordClick,
  onAddChordClick, // Destructure new prop
}: Props) {
  // Select only the state and actions needed for this component
  const {
    lyricsData,
    currentIndex,
    isTimingActive,
    editingLineIndex,
    correctionIndex,
    playbackIndex,
    selectedLineIndex,
    actions,
  } = useKaraokeStore();

  const lyricInputRef = useRef<HTMLTextAreaElement | null>(null);

  const handleImport = () => {
    actions.importLyrics(lyricInputRef.current?.value ?? "");
  };

  return (
    <Card className="flex flex-col p-4 h-full bg-gray-50">
      <h3 className="text-lg font-semibold mb-2 ">Lyric Grid</h3>
      <LyricsGrid
        lyricsData={lyricsData}
        currentIndex={currentIndex}
        isTimingActive={isTimingActive}
        editingLineIndex={editingLineIndex}
        correctionIndex={correctionIndex}
        playbackIndex={playbackIndex}
        selectedLineIndex={selectedLineIndex}
        onWordClick={onWordClick}
        onEditLine={onEditLine}
        onDeleteLine={actions.deleteLine}
        onWordUpdate={actions.updateWord}
        onWordDelete={() => {}} // Placeholder
        onRulerClick={onRulerClick}
        onChordClick={onChordClick}
        onAddChordClick={onAddChordClick} // Pass new handler
      />
      <div className="flex items-center gap-2 mt-4 flex-wrap">
        <Button
          onClick={actions.startPreview}
          disabled={editingLineIndex !== null}
        >
          <BsPlay className="mr-2 h-4 w-4" /> Preview
        </Button>

        {editingLineIndex !== null && (
          <Button
            onClick={onStopTiming}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <BiStop className="mr-2 h-4 w-4" /> Stop Edit
          </Button>
        )}
      </div>
      <hr className="my-4 border-slate-300" />
      <h3 className="text-lg font-semibold mb-2">Import Lyrics</h3>
      <textarea
        ref={lyricInputRef}
        placeholder="Paste lyrics here... Use new lines, spaces, or | to separate words."
        className="w-full p-2 border rounded min-h-[100px]"
        disabled={editingLineIndex !== null}
      />
      <Button
        onClick={handleImport}
        className="mt-2 w-full"
        disabled={editingLineIndex !== null}
      >
        Process Lyrics
      </Button>
    </Card>
  );
}
