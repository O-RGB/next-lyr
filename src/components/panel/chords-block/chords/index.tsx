import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { BiPencil, BiTrash } from "react-icons/bi";
import PopConfirmCommon from "@/components/common/popconfrim";
import ButtonCommon from "@/components/common/button";

interface ChordProps {
  id: string;
  title: string;
  isActive: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isMobile?: boolean;
}

const Chord: React.FC<ChordProps> = React.memo(
  ({ id, title, isActive, onClick, onEdit, onDelete, isMobile = false }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
      useDraggable({ id });

    const style = {
      transform: CSS.Translate.toString(transform),
      zIndex: isDragging ? 50 : 10,
      opacity: isDragging ? 0.5 : 1,
    };

    // Layout สำหรับ mobile (แนวตั้ง)
    if (isMobile) {
      return (
        <div
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          onClick={onClick}
          className={`
            relative border rounded-md w-full text-center text-sm font-mono font-bold 
            cursor-grab active:cursor-grabbing flex flex-col items-center py-2 px-1 min-h-[60px]
            ${
              isActive
                ? "bg-purple-600 text-white ring-2 ring-purple-400 scale-105 shadow-lg"
                : "text-purple-700 bg-white border-purple-200 hover:bg-purple-50 shadow-sm"
            }
          `}
        >
          <span className="text-xs line-clamp-1 text-center mb-1">{title}</span>
          <div className="flex flex-col items-center gap-1">
            <ButtonCommon
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              circle
              className={`!p-1 !bg-transparent ${
                isActive ? "hover:bg-white/20" : "hover:bg-purple-100"
              }`}
              title="Edit Chord"
            >
              <BiPencil className="w-3 h-3" />
            </ButtonCommon>
            <PopConfirmCommon
              onConfirm={() => onDelete()}
              title="Delete Chord?"
              content="Are you sure you want to delete this chord?"
              openbuttonProps={{
                onClick: (e) => e.stopPropagation(),
                circle: true,
                className: `!p-1 ${
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
    }

    // Layout แนวนอนสำหรับ desktop (เดิม)
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onClick={onClick}
        className={`
          relative border rounded-md w-full text-center text-sm font-mono font-bold 
          cursor-grab active:cursor-grabbing flex justify-between items-center px-2
          ${
            isActive
              ? "bg-purple-600 text-white ring-2 ring-purple-400 scale-105 shadow-lg"
              : "text-purple-700 bg-white border-purple-200 hover:bg-purple-50 shadow-sm"
          }
        `}
      >
        <span className="text-xs line-clamp-1 w-12 text-start">{title}</span>
        <div className="flex items-center gap-0.5">
          <ButtonCommon
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            circle
            className={`!p-1 !bg-transparent ${
              isActive ? "hover:bg-white/20" : "hover:bg-purple-100"
            }`}
            title="Edit Chord"
          >
            <BiPencil className="w-3 h-3" />
          </ButtonCommon>
          <PopConfirmCommon
            onConfirm={() => onDelete()}
            title="Delete Chord?"
            content="Are you sure you want to delete this chord?"
            openbuttonProps={{
              onClick: (e) => e.stopPropagation(),
              circle: true,
              className: `!p-1 ${
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
    prev.isActive === next.isActive &&
    prev.isMobile === next.isMobile
);

Chord.displayName = "Chord";
export default Chord;
