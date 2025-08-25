// src/components/lyrics/lyrics-grid/line/chords/chord.tsx
import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Tags from "../../../../common/tags";
import { ChordEvent } from "@/modules/midi-klyr-parser/lib/processor";
import { BiMenu } from "react-icons/bi"; // 1. Import ไอคอน

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
    // 2. ลบ touchAction: "none" ออก เพื่อให้เลื่อนหน้าจอได้
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className="flex items-center gap-1" // จัดวางไอคอนกับแท็กให้อยู่ในแถวเดียวกัน
    >
      {/* 3. สร้าง div ครอบไอคอนเพื่อเป็น "Drag Handle" */}
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab touch-none p-1" // touch-none ป้องกันการเลื่อนจอเมื่อแตะที่นี่
        onClick={(e) => e.stopPropagation()} // ป้องกันไม่ให้ event click ทำงานเมื่อเริ่มลาก
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
