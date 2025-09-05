import React from "react";
import Tags from "../../../../common/tags";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { BiMenu } from "react-icons/bi";
import { ChordEvent } from "@/lib/karaoke/midi/types";

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
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className="flex items-center gap-1"
    >
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab touch-none p-1"
        onClick={(e) => e.stopPropagation()}
      >
        <BiMenu className="text-gray-500" />
      </div>
      <Tags
        disabledTooltip={isDragging}
        text={chord.chord}
        tagsClassName={"text-[8px]"}
        hoverText={`Tick: ${chord.tick}`}
      />
    </div>
  );
};

export default DraggableChordTag;
