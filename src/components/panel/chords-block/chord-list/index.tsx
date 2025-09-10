import React from "react";
import { ChordEvent } from "@/lib/karaoke/midi/types";
import ChordItem from "../chords/item";

interface ChordListProps {
  chordsData: ChordEvent[];
  visibleIndices: { start: number; end: number };
  pixelsPerTick: number;
  onChordClick: (tick: number) => void;
  onEditChord: (chord: ChordEvent) => void;
  onDeleteChord: (tick: number) => void;
  isMobile: boolean;
}

const ChordList: React.FC<ChordListProps> = ({
  chordsData,
  visibleIndices,
  pixelsPerTick,
  onChordClick,
  onEditChord,
  onDeleteChord,
  isMobile,
}) => {
  const visibleChords = React.useMemo(
    () => chordsData.slice(visibleIndices.start, visibleIndices.end),
    [chordsData, visibleIndices]
  );

  return (
    <>
      {visibleChords.map((chord, index) => (
        <ChordItem
          key={`${chord.tick}-${visibleIndices.start + index}`}
          chord={chord}
          index={visibleIndices.start + index}
          pixelsPerTick={pixelsPerTick}
          onChordClick={onChordClick}
          onEditChord={onEditChord}
          onDeleteChord={onDeleteChord}
          isMobile={isMobile}
        />
      ))}
    </>
  );
};

export default React.memo(ChordList);
