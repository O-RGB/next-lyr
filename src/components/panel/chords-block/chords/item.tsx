import React, { useCallback } from "react";
import { ChordEvent } from "@/modules/midi-klyr-parser/lib/processor";
import Chord from ".";

interface ChordItemProps {
  chord: ChordEvent;
  index: number;
  pixelsPerTick: number;
  onChordClick: (tick: number) => void;
  onEditChord: (chord: ChordEvent) => void;
  onDeleteChord: (tick: number) => void;
}

const ChordItem: React.FC<ChordItemProps> = React.memo(
  ({
    chord,
    index,
    pixelsPerTick,
    onChordClick,
    onEditChord,
    onDeleteChord,
  }) => {
    const handleClick = useCallback(
      () => onChordClick(chord.tick),
      [onChordClick, chord.tick]
    );
    const handleEdit = useCallback(
      () => onEditChord(chord),
      [onEditChord, chord]
    );
    const handleDelete = useCallback(
      () => onDeleteChord(chord.tick),
      [onDeleteChord, chord.tick]
    );

    return (
      <div
        className="absolute w-[calc(100%-2rem)] left-1/2 -translate-x-1/2 z-10"
        style={{ top: `${chord.tick * pixelsPerTick}px` }}
      >
        <Chord
          id={`chord-${chord.tick}-${index}`}
          title={chord.chord}
          isActive
          onClick={handleClick}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    );
  }
);

export default ChordItem;
