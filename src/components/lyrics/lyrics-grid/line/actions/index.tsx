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
import { useUiStore } from "@/features/ui/ui-store";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import React from "react";

interface LineActionProps {
  lineIndex: number;
}

const LineAction: React.FC<LineActionProps> = React.memo(
  ({ lineIndex }) => {
    const actions = useKaraokeStore((state) => state.actions);
    const requestConfirm = useUiStore((state) => state.requestConfirm);
    const { handleRetiming } = usePlayerHandlersStore();
    const editingLineIndex = useKaraokeStore((state) => state.editingLineIndex);
    const locale = useSettingsStore((state) => state.uiLocale);

    const menuItems: IContextMenuGroup<string>[] = [
      {
        name: text(locale, "การทำงาน", "Actions"),
        contextMenus: [
          {
            type: "select",
            text: text(locale, "เลือก", "Select"),
            icon: <CheckSquare />,
            onClick: () => {
              actions.setLineSelectionMode(true);
              actions.toggleLineSelection(lineIndex);
            },
          },
          {
            type: "add",
            text: text(locale, "แทรก", "Insert"),
            icon: <Plus />,
            onClick: () => {
              actions.openAddModal(lineIndex);
            },
          },
          {
            type: "edit",
            text: text(locale, "แก้ไข", "Edit"),
            icon: <Pencil />,
            onClick: () => {
              actions.selectLine(lineIndex);
              actions.openEditModal();
            },
          },
          {
            type: "Re Time",
            text: text(locale, "ปาดใหม่", "Retiming"),
            icon: <Clock />,
            onClick: async () => {
              const confirmed = await requestConfirm({
                title: text(locale, "ปาดเนื้อร้องใหม่หรือไม่?", "Retiming this line?"),
                description: text(
                  locale,
                  `เวลาและการแบ่งคำของบรรทัดที่ ${lineIndex + 1} จะถูกสร้างใหม่`,
                  `Timing and word splits for line ${lineIndex + 1} will be rebuilt`
                ),
                tone: "danger",
                confirmLabel: text(locale, "ปาดใหม่", "Retiming"),
              });
              if (confirmed) handleRetiming(lineIndex, lineIndex);
            },
          },
          {
            type: "delete",
            text: text(locale, "ลบ", "Delete"),
            icon: <Trash2 />,
            onClick: async () => {
              const confirmed = await requestConfirm({
                title: text(locale, "ลบบรรทัดนี้หรือไม่?", "Delete this line?"),
                description: text(locale, `บรรทัดที่ ${lineIndex + 1} จะถูกลบออก`, `Line ${lineIndex + 1} will be deleted`),
                tone: "danger",
                confirmLabel: text(locale, "ลบบรรทัด", "Delete line"),
              });
              if (confirmed) actions.deleteLine?.(lineIndex);
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
              title={text(locale, "แก้ไขเนื้อเพลง (Enter)", "Edit lyrics (Enter)")}
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
