"use client";

import { Clock3, Keyboard, Trash2, X } from "lucide-react";

import ButtonCommon from "@/components/common/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import { useUiStore } from "@/features/ui/ui-store";
import { useKaraokeStore } from "@/stores/karaoke-store";

interface LineSelectionToolbarProps {
  compact?: boolean;
}

/** Batch actions shown only after a line's menu starts selection mode. */
export default function LineSelectionToolbar({
  compact = false,
}: LineSelectionToolbarProps) {
  const selectionMode = useKaraokeStore((state) => state.lineSelectionMode);
  const selectedLineIndices = useKaraokeStore(
    (state) => state.selectedLineIndices
  );
  const selectionAnchor = useKaraokeStore(
    (state) => state.lineSelectionAnchor
  );
  const shiftArmed = useKaraokeStore((state) => state.lineShiftArmed);
  const isTiming = useKaraokeStore(
    (state) => state.isTimingActive || state.editingLineIndex !== null
  );
  const actions = useKaraokeStore((state) => state.actions);
  const requestConfirm = useUiStore((state) => state.requestConfirm);
  const handleRetimingLines = usePlayerHandlersStore(
    (state) => state.handleRetimingLines
  );

  if (!selectionMode || isTiming) return null;

  const selectedCount = selectedLineIndices.length;
  const canOperate = selectedCount > 0;

  const handleDelete = async () => {
    if (!canOperate) return;
    const confirmed = await requestConfirm({
      title: "ลบบรรทัดที่เลือกหรือไม่?",
      description: `บรรทัดที่เลือก ${selectedCount} บรรทัดจะถูกลบออก`,
      tone: "danger",
      confirmLabel: "ลบบรรทัด",
    });
    if (!confirmed) return;

    void actions.deleteLines(selectedLineIndices);
    actions.setLineSelectionMode(false);
  };

  return (
    <div className="flex items-center gap-1.5">
      <ButtonCommon
        type="button"
        color="danger"
        variant="outline"
        size={compact ? "xs" : "sm"}
        icon={<X />}
        onClick={() => actions.setLineSelectionMode(false)}
        title="ยกเลิกการเลือก"
      >
        {compact ? null : "ยกเลิกเลือก"}
      </ButtonCommon>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <ButtonCommon
              type="button"
              color="white"
              variant="solid"
              size={compact ? "xs" : "sm"}
              icon={<Clock3 />}
              disabled={!canOperate}
              title="การทำงานกับบรรทัดที่เลือก"
            >
              {compact ? null : "การทำงาน"}
            </ButtonCommon>
          }
        />
        <DropdownMenuContent align="start" className="min-w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              {selectedCount > 0
                ? `เลือกแล้ว ${selectedCount} บรรทัด`
                : "ยังไม่ได้เลือกบรรทัด"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!canOperate}
              onClick={() => handleRetimingLines(selectedLineIndices)}
            >
              <Clock3 />
              <span>ปาดใหม่</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canOperate} onClick={handleDelete}>
              <Trash2 />
              <span>ลบ</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <ButtonCommon
        type="button"
        color={shiftArmed ? "warning" : "white"}
        variant={shiftArmed ? "outline" : "solid"}
        size={compact ? "xs" : "sm"}
        icon={<Keyboard />}
        disabled={selectionAnchor === null}
        onClick={() => actions.toggleLineShift()}
        title="Shift: เลือกช่วงจากบรรทัดล่าสุด"
        aria-pressed={shiftArmed}
      >
        {compact ? null : "Shift"}
      </ButtonCommon>
    </div>
  );
}
