import { useKaraokeStore } from "../../stores/karaoke-store";
import { ChordEvent } from "../../modules/midi-klyr-parser/lib/processor";
import LyricsGrid from "../lyrics/lyrics-grid";
import Card from "../common/card";
import { MusicMode } from "@/types/common.type";

type Props = {
  onWordClick: (index: number) => void;
  onEditLine: (lineIndex: number) => void;
  onStopTiming: () => void;
  onRulerClick: (
    lineIndex: number,
    tickPercentage: number,
    lineDuration: number
  ) => void;
  onChordClick: (chord: ChordEvent) => void;
  onAddChordClick: (lineIndex: number) => void;
  currentPlaybackTime: number | null | undefined;
  mode: MusicMode | null;
};

export default function LyricsPanel({
  onWordClick,
  onEditLine,
  onStopTiming,
  onRulerClick,
  onChordClick,
  onAddChordClick,
  currentPlaybackTime,
  mode,
}: Props) {
  const {
    lyricsData,
    currentIndex,
    isTimingActive,
    editingLineIndex,
    correctionIndex,
    playbackIndex,
    selectedLineIndex,
    midiInfo,
    actions,
    currentTime,
  } = useKaraokeStore();

  return (
    <Card className="flex flex-col p-4 h-full bg-gray-50 space-y-2">
      <div className="flex justify-between">
        <h3 className="text-lg font-semibold mb-2 ">Lyric</h3>
        <div>
          <div className="h-full px-2 bg-white font-mono text-sm flex items-center justify-center  border border-slate-300 rounded-lg">
            {currentTime}
          </div>
        </div>
      </div>
      <LyricsGrid
        lyricsData={lyricsData}
        currentIndex={currentIndex}
        isTimingActive={isTimingActive}
        editingLineIndex={editingLineIndex}
        correctionIndex={correctionIndex}
        playbackIndex={playbackIndex}
        selectedLineIndex={selectedLineIndex}
        onWordClick={onWordClick}
        onEditLine={(line) => {
          actions.selectLine(line);
          actions.openEditModal();
        }}
        onDeleteLine={actions.deleteLine}
        onWordUpdate={actions.updateWord}
        onWordDelete={() => {}}
        onRulerClick={onRulerClick}
        onChordClick={onChordClick}
        onAddChordClick={onAddChordClick}
        currentPlaybackTime={currentPlaybackTime}
        mode={mode}
        midiInfo={midiInfo}
      />
    </Card>
  );
}
