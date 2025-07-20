import { useRef } from "react";
import { useKaraokeStore } from "../../store/useKaraokeStore";
import { Button } from "../common/button";
import { Card } from "../common/card";
import LyricsGrid from "../lyrics/lyrics-grid";
import { BsPlay, BsSave } from "react-icons/bs";
import { BiStop } from "react-icons/bi";

type Props = {
  // Props are now for events that the parent needs to handle
  onWordClick: (index: number) => void;
  onEditLine: (lineIndex: number) => void;
  onStopTiming: () => void;
};

export default function LyricsPanel({
  onWordClick,
  onEditLine,
  onStopTiming,
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
    <Card className="flex-[3] flex flex-col p-4">
      <h3 className="text-lg font-semibold mb-2">Lyric Grid</h3>
      <LyricsGrid
        // Pass data down to LyricsGrid (or it can also connect to the store)
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
      />
      <div className="flex items-center gap-2 mt-4 flex-wrap">
        <Button onClick={actions.startPreview}>
          <BsPlay className="mr-2 h-4 w-4" /> Preview
        </Button>
        <Button onClick={() => alert("Exporting...")}>
          <BsSave className="mr-2 h-4 w-4" /> Export JSON
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
      />
      <Button onClick={handleImport} className="mt-2 w-full">
        Process Lyrics
      </Button>
    </Card>
  );
}
