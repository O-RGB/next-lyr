import React, { useEffect } from "react";
import DraggableChordTag from "./chord";
import { ChordEvent } from "@/modules/midi-klyr-parser/lib/processor";
import { useKaraokeStore } from "@/stores/karaoke-store";

interface ChordsListLineProps {
  lineIndex: number;

  chords: ChordEvent[];
  rulerStartTime: number;
  lineDuration: number;
  onChordClick?: (chord: ChordEvent) => void;
}

const ChordsListLine: React.FC<ChordsListLineProps> = ({
  lineIndex,
  chords,
  lineDuration,
  onChordClick,
  rulerStartTime,
}) => {
  useEffect(() => {}, [chords]);

  return (
    <div className="absolute h-5 w-full -top-1">
      {chords.map((chord, i) => {
        const firstWordTick = rulerStartTime ?? 0;
        const totalLineTick = lineDuration || 1;
        const pos =
          totalLineTick > 0
            ? ((chord.tick - firstWordTick) / totalLineTick) * 100
            : 0;
        return (
          <DraggableChordTag
            key={`${chord.tick}-${i}`}
            chord={chord}
            initialLeftPercentage={pos}
            onClick={() => onChordClick?.(chord)}
          />
        );
      })}
    </div>
  );
};

export default ChordsListLine;
