import ButtonCommon from "@/components/common/button";
import PopConfirmCommon from "@/components/common/popconfrim";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import { useKaraokeStore } from "@/stores/karaoke-store";
import React from "react";
import { BiPencil, BiTime, BiTrash } from "react-icons/bi";

interface LineActionProps {
  lineIndex: number;
}

const LineAction: React.FC<LineActionProps> = React.memo(
  ({ lineIndex }) => {
    const actions = useKaraokeStore((state) => state.actions);
    const { handleRetiming } = usePlayerHandlersStore();
    const editingLineIndex = useKaraokeStore((state) => state.editingLineIndex);

    return (
      <div className="flex flex-col lg:flex-row items-center border-l lg:border-0">
        <ButtonCommon
          onClick={() => {
            actions.selectLine(lineIndex);
            actions.openEditModal();
          }}
          disabled={editingLineIndex !== null}
          title="Edit Lyrics (Enter)"
          color="white"
          circle
          variant="ghost"
          size="xs"
          icon={<BiPencil className="text-slate-600" />}
          className="z-20"
        />
        <PopConfirmCommon
          title="Re-time from this line?"
          content="This will clear all timing data from this line onwards. Are you sure?"
          openbuttonProps={{
            disabled: editingLineIndex !== null,
            title: "Re-time from here",
            icon: <BiTime />,
            circle: true,
            color: "warning",
            variant: "ghost",
            size: "xs",
            className: "z-20",
          }}
          onConfirm={() => handleRetiming(lineIndex)}
        />
        <PopConfirmCommon
          openbuttonProps={{
            disabled: editingLineIndex !== null,
            title: "Delete Line",
            icon: <BiTrash />,
            circle: true,
            color: "danger",
            variant: "ghost",
            size: "xs",
            className: "z-20",
          }}
          onConfirm={() => actions.deleteLine?.(lineIndex)}
        />
      </div>
    );
  },
  (prev, next) => prev.lineIndex === next.lineIndex
);

LineAction.displayName = "LineAction";

export default LineAction;
