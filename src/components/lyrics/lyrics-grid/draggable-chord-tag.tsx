// update/components/lyrics/lyrics-grid/draggable-chord-tag.tsx
import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Tags from "../../common/tags";
import { ChordEvent } from "@/lib/karaoke/midi-tags-decode";

export interface DraggableChordTagProps {
  chord: ChordEvent;
  initialLeftPercentage: number;
  onClick: () => void;
}

const DraggableChordTag: React.FC<DraggableChordTagProps> = ({
  chord,
  initialLeftPercentage,
  onClick,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `chord-${chord.tick}`,
      data: { chord },
    });

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${initialLeftPercentage}%`,
    top: "-0.65rem",
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : 10,
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
    >
      <Tags
        disabledTooltip={isDragging}
        text={chord.chord}
        className="cursor-grab"
        tagsClassName={"text-[8px]"}
        hoverText={`Tick: ${chord.tick}`}
      />
    </div>
  );
};

export default DraggableChordTag;
