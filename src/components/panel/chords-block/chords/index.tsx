import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { BiPencil, BiMenu } from "react-icons/bi";
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

    if (isMobile) {
      return (
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          onClick={onClick}
          className={`
            relative border rounded-md w-full text-center text-sm font-mono font-bold
            flex flex-col items-center py-1 px-1 min-h-[60px]
            ${
              isActive
                ? "bg-purple-600 text-white ring-2 ring-purple-400 scale-105 shadow-lg"
                : "text-purple-700 bg-white border-purple-200 hover:bg-purple-50 shadow-sm"
            }
          `}
        >
          {/* Drag Handle (Icon สำหรับลาก) */}
          <div
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <BiMenu
              className={`w-3 h-3 ${isActive ? "text-white" : "text-gray-300"}`}
            />
          </div>

          <span className="text-[10px] line-clamp-1 text-center my-1 flex-grow flex items-center">
            {title}
          </span>

          <div className="flex flex-row items-center gap-1">
            <ButtonCommon
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              circle
              variant="ghost"
              color={isActive ? "white" : "secondary"}
              className={`!p-1 !bg-transparent  ${
                isActive ? "hover:bg-white/20" : "hover:bg-purple-100"
              }`}
              size="xs"
              title="Edit Chord"
            >
              <BiPencil className="w-3 h-3" />
            </ButtonCommon>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        onClick={onClick}
        className={`
          relative border rounded-md w-full text-center text-sm font-mono font-bold
          flex justify-between items-center px-2 gap-1
          ${
            isActive
              ? "bg-purple-600 text-white ring-2 ring-purple-400 scale-105 shadow-lg"
              : "text-purple-700 bg-white border-purple-200 hover:bg-purple-50 shadow-sm"
          }
        `}
      >
        {/* Drag Handle */}
        <div
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-1"
          onClick={(e) => e.stopPropagation()}
        >
          <BiMenu
            className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-500"}`}
          />
        </div>

        <span className="text-xs line-clamp-1 flex-grow">{title}</span>

        <div className="flex items-center gap-0.5">
          <ButtonCommon
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            circle
            className={`!p-1 !bg-transparent `}
            title="Edit Chord"
            size="xs"
            color={!isActive ? "white" : "secondary"}
          >
            <BiPencil className="w-3 h-3" />
          </ButtonCommon>
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
