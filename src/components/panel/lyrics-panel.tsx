import { useKaraokeStore } from "../../stores/karaoke-store";
import { ChordEvent } from "../../modules/midi-klyr-parser/lib/processor";
import LyricsGrid from "../lyrics/lyrics-grid";
import Card from "../common/card";
import { MusicMode } from "@/types/common.type";
import TimeStampe from "./timestamp";
import ChordsBlock from "./chords-block";

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
  onChordBlockClick: (tick: number) => void;
  onAddChordAtCurrentTime: (tick: number) => void;
  onDeleteChord: (tick: number) => void;
  mode: MusicMode | null;
};

export default function LyricsPanel({
  onEditLine,
  onStopTiming,
  onWordClick,
  onRulerClick,
  onChordClick,
  onAddChordClick,
  onChordBlockClick,
  onAddChordAtCurrentTime,
  onDeleteChord,
  mode,
}: Props) {
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const midiInfo = useKaraokeStore((state) => state.midiInfo);
  const actions = useKaraokeStore((state) => state.actions);

  return (
    <Card className="flex flex-col p-4 h-full bg-gray-50 space-y-2">
      <div className="flex justify-between">
        <div className="text-lg font-semibold mb-2 ">Lyric</div>
        <div>
          <TimeStampe></TimeStampe>
        </div>
      </div>
      <div className="flex gap-2 h-full overflow-hidden">
        <div className="w-full">
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
        </div>
        <div className="w-[20%]">
          <ChordsBlock
            onChordClick={onChordBlockClick}
            onAddChord={onAddChordAtCurrentTime}
            onEditChord={onChordClick}
            onDeleteChord={onDeleteChord}
          />
        </div>
      </div>
    </Card>
  );
}
