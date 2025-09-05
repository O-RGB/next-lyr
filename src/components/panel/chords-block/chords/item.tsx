import React, { useCallback, useMemo } from "react";
import Chord from ".";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { ChordEvent } from "@/lib/karaoke/midi/types";

interface ChordItemProps {
  chord: ChordEvent;
  index: number;
  pixelsPerTick: number;
  onChordClick: (tick: number) => void;
  onEditChord: (chord: ChordEvent) => void;
  onDeleteChord: (tick: number) => void;
  isMobile: boolean;
}

const ChordItem: React.FC<ChordItemProps> = React.memo(
  ({
    chord,
    index,
    pixelsPerTick,
    onChordClick,
    onEditChord,
    onDeleteChord,
    isMobile,
  }) => {
    const isActive = useKaraokeStore(
      useCallback(
        (state) => {
          const currentTime = state.currentTime;
          return currentTime >= chord.tick;
        },
        [chord.tick]
      )
    );

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

    const itemStyle: React.CSSProperties = useMemo(
      () =>
        isMobile
          ? {
              left: `${chord.tick * pixelsPerTick}px`,
              top: "50%",
              transform: "translateY(-50%)",
            }
          : {
              top: `${chord.tick * pixelsPerTick}px`,
              left: "50%",
              transform: "translateX(-50%)",
            },
      [chord.tick, pixelsPerTick, isMobile]
    );

    const containerClasses = isMobile
      ? "absolute h-[calc(100%-2rem)] top-1/2 -translate-y-1/2 z-10"
      : "absolute w-[calc(100%-2rem)] left-1/2 -translate-x-1/2 z-10";

    return (
      <div className={containerClasses} style={itemStyle}>
        <Chord
          id={`chord-${chord.tick}-${index}`}
          title={chord.chord}
          isActive={isActive}
          onClick={handleClick}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isMobile={isMobile}
        />
      </div>
    );
  },

  (prevProps, nextProps) => {
    return (
      prevProps.chord.tick === nextProps.chord.tick &&
      prevProps.chord.chord === nextProps.chord.chord &&
      prevProps.pixelsPerTick === nextProps.pixelsPerTick &&
      prevProps.isMobile === nextProps.isMobile &&
      prevProps.index === nextProps.index
    );
  }
);

ChordItem.displayName = "ChordItem";
export default ChordItem;
