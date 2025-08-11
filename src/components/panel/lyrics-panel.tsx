// src/components/panel/lyrics-panel.tsx
import { useKaraokeStore } from "../../stores/karaoke-store";
import { ChordEvent } from "../../modules/midi-klyr-parser/lib/processor";
import LyricsGrid from "../lyrics/lyrics-grid";
import Card from "../common/card";
import { MusicMode } from "@/types/common.type";
import TimeStampe from "./timestamp";
import ChordsBlock from "./chords-block";
import useIsMobile from "@/hooks/useIsMobile"; // <<< เพิ่มเข้ามา

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
  onAddChordAtCurrentTime: (tick?: number) => void;
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
  const actions = useKaraokeStore((state) => state.actions);

  return (
    <Card className="flex flex-col p-4 h-full bg-gray-50 space-y-2">
      <div className="flex justify-between">
        <div className="text-lg font-semibold mb-2 ">Lyric</div>
        <div>
          <TimeStampe />
        </div>
      </div>

      <div className="flex flex-col-reverse md:flex-row w-full gap-2 h-full overflow-hidden">
        <div className="flex-grow min-h-0 md:min-w-0">
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
          />
        </div>
        <div className="h-[100px] md:h-full md:w-[150px] flex-shrink-0">
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
