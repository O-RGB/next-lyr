import React from "react";
import DraggableChordTag from ".";
import { ChordEvent } from "@/modules/midi-klyr-parser/lib/processor";

interface ChordsListLineProps {
  chords: ChordEvent[];
  rulerStartTime: number | null;
  lineDuration: number;
  onChordClick: (chord: ChordEvent) => void;
}

const ChordsListLine: React.FC<ChordsListLineProps> = ({
  chords,
  lineDuration,
  onChordClick,
  rulerStartTime,
}) => {
  return (
    <>
      {chords.length > 0 && (
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
                onClick={() => onChordClick(chord)}
              />
            );
          })}
        </div>
      )}
    </>
  );
};

export default ChordsListLine;
