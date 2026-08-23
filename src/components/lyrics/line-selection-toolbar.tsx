"use client";

import { ListChecks, ListRestart, Settings2, Trash2, X } from "lucide-react";

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
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import { hasCompleteLyricTiming } from "@/lib/karaoke/utils";

interface LineSelectionToolbarProps {
  compact?: boolean;
  compactActions?: boolean;
}

/** Batch actions shown only after a line's menu starts selection mode. */
export default function LineSelectionToolbar({
  compact = false,
  compactActions = false,
}: LineSelectionToolbarProps) {
  const selectionMode = useKaraokeStore((state) => state.lineSelectionMode);
  const selectedLineIndices = useKaraokeStore(
    (state) => state.selectedLineIndices
  );
  const isTiming = useKaraokeStore(
    (state) => state.isTimingActive || state.editingLineIndex !== null
  );
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const actions = useKaraokeStore((state) => state.actions);
  const requestConfirm = useUiStore((state) => state.requestConfirm);
  const handleRetimingLines = usePlayerHandlersStore(
    (state) => state.handleRetimingLines
  );
  const locale = useSettingsStore((state) => state.uiLocale);

  if (!selectionMode || isTiming || !hasCompleteLyricTiming(lyricsData)) {
    return null;
  }

  const selectedCount = selectedLineIndices.length;
  const canOperate = selectedCount > 0;
  const actionButtonsCompact = compact || compactActions;

  const handleDelete = async () => {
    if (!canOperate) return;
    const confirmed = await requestConfirm({
      title: text(locale, "ลบบรรทัดที่เลือกหรือไม่?", "Delete selected lines?"),
      description: text(
        locale,
        `บรรทัดที่เลือก ${selectedCount} บรรทัดจะถูกลบออก`,
        `${selectedCount} selected line${selectedCount === 1 ? "" : "s"} will be deleted`
      ),
      tone: "danger",
      confirmLabel: text(locale, "ลบบรรทัด", "Delete lines"),
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
        size={actionButtonsCompact ? "xs" : "sm"}
        icon={<X />}
        onClick={() => actions.setLineSelectionMode(false)}
        title={text(locale, "ยกเลิกการเลือก", "Clear selection")}
      >
        {text(locale, "ยกเลิกเลือก", "Clear selection")}
      </ButtonCommon>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <ButtonCommon
              type="button"
              color="white"
              variant="solid"
              size={actionButtonsCompact ? "xs" : "sm"}
              icon={<Settings2 />}
              disabled={!canOperate}
              title={text(locale, "การทำงานกับบรรทัดที่เลือก", "Actions for selected lines")}
            >
              {actionButtonsCompact ? null : text(locale, "การทำงาน", "Actions")}
            </ButtonCommon>
          }
        />
        <DropdownMenuContent align="start" className="min-w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              {selectedCount > 0
                ? text(
                    locale,
                    `เลือกแล้ว ${selectedCount} บรรทัด`,
                    `${selectedCount} line${selectedCount === 1 ? "" : "s"} selected`
                  )
                : text(locale, "ยังไม่ได้เลือกบรรทัด", "No lines selected")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={selectedCount === lyricsData.length}
              onClick={() => actions.selectAllLines()}
            >
              <ListChecks />
              <span>{text(locale, "เลือกทั้งหมด", "Select all")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canOperate}
              onClick={() => handleRetimingLines(selectedLineIndices)}
            >
              <ListRestart />
              <span>{text(locale, "ปาดใหม่", "Retiming")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canOperate} onClick={handleDelete}>
              <Trash2 />
              <span>{text(locale, "ลบ", "Delete")}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

    </div>
  );
}
