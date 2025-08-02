import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { BiPencil, BiTrash } from "react-icons/bi";
import PopConfirmCommon from "@/components/common/popconfrim";

interface ChordProps {
  id: string;
  title: string;
  isActive: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const Chord: React.FC<ChordProps> = React.memo(
  ({ id, title, isActive, onClick, onEdit, onDelete }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
      useDraggable({ id });

    const style = {
      transform: CSS.Translate.toString(transform),
      zIndex: isDragging ? 50 : 10,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onClick={onClick}
        className={`
          relative border rounded-md p-1 w-full text-center text-sm font-mono font-bold 
          cursor-grab active:cursor-grabbing transition-all duration-150 flex justify-between items-center px-2
          ${
            isActive
              ? "bg-purple-600 text-white ring-2 ring-purple-400 scale-105 shadow-lg"
              : "text-purple-700 bg-white border-purple-200 hover:bg-purple-50 shadow-sm"
          }
        `}
      >
        <span>{title}</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className={`p-1 rounded ${
              isActive ? "hover:bg-white/20" : "hover:bg-purple-100"
            }`}
            title="Edit Chord"
          >
            <BiPencil className="w-3 h-3" />
          </button>
          <PopConfirmCommon
            onConfirm={() => onDelete()}
            title="Delete Chord?"
            content="Are you sure you want to delete this chord?"
            openbuttonProps={{
              onClick: (e) => e.stopPropagation(),
              className: `p-1 rounded ${
                isActive ? "hover:bg-white/20" : "hover:bg-purple-100"
              }`,
              title: "Delete Chord",
              icon: <BiTrash className="w-3 h-3" />,
              color: isActive ? "white" : "secondary",
              variant: "ghost",
              size: "sm",
            }}
          />
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.id === next.id &&
    prev.title === next.title &&
    prev.isActive === next.isActive
);

export default Chord;
