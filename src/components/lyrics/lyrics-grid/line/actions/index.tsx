import ButtonCommon from "@/components/common/button";
import PopConfirmCommon from "@/components/common/popconfrim";
import React from "react";
import { BiPencil, BiTrash } from "react-icons/bi";

interface LineActionProps {
  editingLineIndex?: number;
  onEditLine?: (lineIndex: number) => void;
  onDeleteLine?: (lineIndex: number) => void;
  lineIndex: number;
}

const LineAction: React.FC<LineActionProps> = React.memo(
  ({ editingLineIndex, onEditLine, onDeleteLine, lineIndex }) => {
    console.log("Render LineAction", lineIndex);
    return (
      <div className="flex flex-col lg:flex-row items-center">
        <ButtonCommon
          onClick={() => onEditLine?.(lineIndex)}
          // disabled={editingLineIndex !== null}
          title="Start Timing Edit (Ctrl+Enter)"
          color="white"
          circle
          variant="ghost"
          size="sm"
          icon={<BiPencil className="text-slate-600" />}
          className="z-20"
        />
        <PopConfirmCommon
          openbuttonProps={{
            // disabled: editingLineIndex !== null,
            title: "Delete Line",
            icon: <BiTrash />,
            circle: true,
            color: "danger",
            variant: "ghost",
            size: "sm",
            className: "z-20",
          }}
          onConfirm={() => onDeleteLine?.(lineIndex)}
        />
      </div>
    );
  },
  (prev, next) =>
    prev.editingLineIndex === next.editingLineIndex &&
    prev.lineIndex === next.lineIndex &&
    prev.onEditLine === next.onEditLine &&
    prev.onDeleteLine === next.onDeleteLine
);

LineAction.displayName = "LineAction";
export default LineAction;
