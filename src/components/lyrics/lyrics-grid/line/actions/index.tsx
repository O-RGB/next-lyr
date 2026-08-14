import {
  CheckSquare,
  Clock,
  Ellipsis,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import ButtonCommon from "@/components/common/button";
import ContextMenuCommon, {
  IContextMenuGroup,
} from "@/components/common/data-input/menu";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import { useKaraokeStore } from "@/stores/karaoke-store";
import React from "react";

interface LineActionProps {
  lineIndex: number;
}

const LineAction: React.FC<LineActionProps> = React.memo(
  ({ lineIndex }) => {
    const actions = useKaraokeStore((state) => state.actions);
    const { handleRetiming } = usePlayerHandlersStore();
    const editingLineIndex = useKaraokeStore((state) => state.editingLineIndex);

    const menuItems: IContextMenuGroup<string>[] = [
      {
        name: "การทำงาน",
        contextMenus: [
          {
            type: "select",
            text: "เลือก",
            icon: <CheckSquare />,
            onClick: () => {
              actions.setLineSelectionMode(true);
              actions.toggleLineSelection(lineIndex);
            },
          },
          {
            type: "add",
            text: "แทรก",
            icon: <Plus />,
            onClick: () => {
              actions.openAddModal(lineIndex);
            },
          },
          {
            type: "edit",
            text: "แก้ไข",
            icon: <Pencil />,
            onClick: () => {
              actions.selectLine(lineIndex);
              actions.openEditModal();
            },
          },
          {
            type: "Re Time",
            text: "ปาดใหม่",
            icon: <Clock />,
            onClick: () => {
              if (
                confirm(
                  "ปาดเนื้อร้องบรรทัดที่ " + (lineIndex + 1) + " ใหม่?"
                )
              ) {
                handleRetiming(lineIndex, lineIndex);
              }
            },
          },
          {
            type: "delete",
            text: "ลบ",
            icon: <Trash2 />,
            onClick: () => {
              if (confirm("ลบบรรทัดที่ " + (lineIndex + 1) + " ออกไป?")) {
                actions.deleteLine?.(lineIndex);
              }
            },
          },
        ],
      },
    ];
    return (
      <div className="flex flex-row items-center border-l lg:border-0">
        <ContextMenuCommon
          menuButton={
            <ButtonCommon
              disabled={editingLineIndex !== null}
              title="Edit Lyrics (Enter)"
              color="white"
              circle
              variant="ghost"
              size="xs"
              icon={<Ellipsis className="text-muted-foreground rotate-90" />}
              className="z-20"
            ></ButtonCommon>
          }
          items={menuItems}
        />
      </div>
    );
  },
  (prev, next) => prev.lineIndex === next.lineIndex
);

LineAction.displayName = "LineAction";

export default LineAction;
