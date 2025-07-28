import { useKaraokeStore } from "../../stores/karaoke-store";
import { ChordEvent } from "../../modules/midi-klyr-parser/lib/processor";
import LyricsGrid from "../lyrics/lyrics-grid";
import Card from "../common/card";
import { MusicMode } from "@/types/common.type";

type Props = {
  onEditLine: (lineIndex: number) => void;
  onStopTiming: () => void;
  onWordClick: (index: number) => void;
  onRulerClick: (
    lineIndex: number,
    tickPercentage: number,
    lineDuration: number
  ) => void;
  onChordClick: (chord: ChordEvent) => void;
  onAddChordClick: (lineIndex: number) => void;
  mode: MusicMode | null;
};

export default function LyricsPanel({
  onEditLine,
  onStopTiming,
  onWordClick,
  onRulerClick,
  onChordClick,
  onAddChordClick,
  mode,
}: Props) {
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const midiInfo = useKaraokeStore((state) => state.midiInfo);
  const actions = useKaraokeStore((state) => state.actions);

  return (
    <Card className="flex flex-col p-4 h-full bg-gray-50 space-y-2">
      {/* <div className="flex justify-between">
        <h3 className="text-lg font-semibold mb-2 ">Lyric</h3>
      </div> */}
      <LyricsGrid
        lyricsData={lyricsData}
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
        mode={mode}
        midiInfo={midiInfo}
      />
    </Card>
  );
}
