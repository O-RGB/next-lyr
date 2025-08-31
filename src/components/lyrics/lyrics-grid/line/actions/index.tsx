import ButtonCommon from "@/components/common/button";
import ContextMenuCommon, {
  IContextMenuGroup,
} from "@/components/common/data-input/menu";
import PopConfirmCommon from "@/components/common/popconfrim";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import { useKaraokeStore } from "@/stores/karaoke-store";
import React from "react";
import { BiMenu, BiPencil, BiTime, BiTrash } from "react-icons/bi";
import { CiMenuKebab } from "react-icons/ci";
import { FaEdit } from "react-icons/fa";
import { FiLogOut, FiPlus, FiTrash2 } from "react-icons/fi";
import { GoKebabHorizontal } from "react-icons/go";
import { IoMdAdd } from "react-icons/io";

interface LineActionProps {
  lineIndex: number;
}

const LineAction: React.FC<LineActionProps> = React.memo(
  ({ lineIndex }) => {
    const actions = useKaraokeStore((state) => state.actions);
    const handleRetiming = usePlayerHandlersStore().handleRetiming;
    const editingLineIndex = useKaraokeStore((state) => state.editingLineIndex);

    const menuItems: IContextMenuGroup<string>[] = [
      {
        name: "การทำงาน",
        contextMenus: [
          {
            type: "add",
            text: "แทรก",
            icon: <IoMdAdd />,
            onClick: () => {
              actions.openAddModal(lineIndex);
            },
          },
          {
            type: "edit",
            text: "แก้ไข",
            icon: <BiPencil />,
            onClick: () => {
              actions.selectLine(lineIndex);
              actions.openEditModal();
            },
          },
          {
            type: "Re Time",
            text: "ปาดเนื้อใหม่",
            icon: <BiTime />,
            onClick: () => {
              if (
                confirm(
                  "ปาดเนื้อใหม่ตั้งแต่บรรทัดที่ " +
                    (lineIndex + 1) +
                    " เป็นต้นไป?"
                )
              ) {
                handleRetiming(lineIndex);
              }
            },
          },
          {
            type: "delete",
            text: "ลบ",
            icon: <BiTrash />,
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
              icon={<GoKebabHorizontal className="text-slate-400 rotate-90" />}
              className="z-20"
            ></ButtonCommon>
          }
          items={menuItems}
        />
        {/* <ButtonCommon
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
        /> */}
      </div>
    );
  },
  (prev, next) => prev.lineIndex === next.lineIndex
);

LineAction.displayName = "LineAction";

export default LineAction;
