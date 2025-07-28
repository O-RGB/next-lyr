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

const LineAction: React.FC<LineActionProps> = ({
  onEditLine,
  onDeleteLine,
  editingLineIndex,
  lineIndex,
}) => {
  return (
    <>
      <div className="flex items-center gap-2 ml-4">
        <ButtonCommon
          onClick={() => onEditLine?.(lineIndex)}
          disabled={editingLineIndex !== null}
          title="Start Timing Edit (Ctrl+Enter)"
          color="white"
          circle
          variant="ghost"
          size="sm"
          icon={<BiPencil className="text-slate-600" />}
          className="z-20"
        ></ButtonCommon>
        <PopConfirmCommon
          openbuttonProps={{
            disabled: editingLineIndex !== null,
            title: "Delete Line",
            icon: <BiTrash></BiTrash>,
            circle: true,
            color: "danger",
            variant: "ghost",
            size: "sm",
            className: "z-20",
          }}
          onConfirm={() => onDeleteLine?.(lineIndex)}
        ></PopConfirmCommon>
      </div>
    </>
  );
};

export default LineAction;
