import ButtonCommon from "@/components/common/button";
import PopConfirmCommon from "@/components/common/popconfrim";
import { useKaraokeStore } from "@/stores/karaoke-store";
import React from "react";
import { BiPencil, BiTrash } from "react-icons/bi";

interface LineActionProps {
  lineIndex: number;
}

const LineAction: React.FC<LineActionProps> = React.memo(
  ({ lineIndex }) => {
    const actions = useKaraokeStore((state) => state.actions);
    return (
      <div className="flex flex-col lg:flex-row items-center">
        <ButtonCommon
          onClick={() => {
            actions.selectLine(lineIndex);
            actions.openEditModal();
          }}
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
          onConfirm={() => actions.deleteLine?.(lineIndex)}
        />
      </div>
    );
  },
  (prev, next) => prev.lineIndex === next.lineIndex
);

export default LineAction;
