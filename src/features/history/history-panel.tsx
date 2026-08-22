"use client";

import { Check, Redo2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUiStore } from "@/features/ui/ui-store";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import { cn } from "@/lib/utils";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { canRedo, canUndo } from "@/stores/karaoke-store/history";

function displayHistoryLabel(locale: "th" | "en", label: string): string {
  const labels: Record<string, [string, string]> = {
    เริ่มต้น: ["เริ่มต้น", "Initial state"],
    "แก้ข้อมูลเพลง": ["แก้ข้อมูลเพลง", "Edit song data"],
    "นำเข้าเนื้อร้อง": ["นำเข้าเนื้อร้อง", "Import lyrics"],
    "ลบบรรทัด": ["ลบบรรทัด", "Delete line"],
    "ลบบรรทัดที่เลือก": ["ลบบรรทัดที่เลือก", "Delete selected lines"],
    "แก้บรรทัด": ["แก้บรรทัด", "Edit line"],
    "เพิ่มบรรทัด": ["เพิ่มบรรทัด", "Add line"],
    "แก้คำ": ["แก้คำ", "Edit word"],
    "เพิ่มคำ": ["เพิ่มคำ", "Add word"],
    "ลบคำ": ["ลบคำ", "Delete word"],
    "เพิ่มคอร์ด": ["เพิ่มคอร์ด", "Add chord"],
    "รับคอร์ดแนะนำทั้งหมด": ["รับคอร์ดแนะนำทั้งหมด", "Accept suggested chords"],
    "แก้คอร์ด": ["แก้คอร์ด", "Edit chord"],
    "ลบคอร์ด": ["ลบคอร์ด", "Delete chord"],
    "ปรับเวลาคำ": ["ปรับเวลาคำ", "Adjust word timing"],
    "ปาดเนื้อร้อง": ["ปาดเนื้อร้อง", "Time lyrics"],
  };
  const pair = labels[label];
  return pair ? text(locale, pair[0], pair[1]) : label;
}

/**
 * The undo log, as a list you can jump around in.
 *
 * Undo/redo alone make you guess how far back a change was; a labelled log
 * turns "undo eight times and hope" into one click.
 */
export function HistoryPanel() {
  const dialog = useUiStore((state) => state.dialog);
  const openDialog = useUiStore((state) => state.openDialog);
  const history = useKaraokeStore((state) => state.history);
  const actions = useKaraokeStore((state) => state.actions);
  const locale = useSettingsStore((state) => state.uiLocale);

  return (
    <Dialog
      open={dialog === "history"}
      onOpenChange={(next) => openDialog(next ? "history" : null)}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{text(locale, "ประวัติการแก้ไข", "Edit history")}</DialogTitle>
          <DialogDescription>
            {text(locale, "กดที่รายการเพื่อย้อนกลับไปยังจุดนั้น", "Select an entry to return to that point")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canUndo(history)}
            onClick={actions.undo}
          >
            <Undo2 />
            {text(locale, "ย้อนกลับ", "Undo")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!canRedo(history)}
            onClick={actions.redo}
          >
            <Redo2 />
            {text(locale, "ทำซ้ำ", "Redo")}
          </Button>
          <span className="ml-auto text-xs text-muted-foreground tabnum">
            {history.index + 1} / {history.entries.length}
          </span>
        </div>

        <ul className="max-h-[50dvh] divide-y divide-line overflow-y-auto overscroll-contain border border-line bg-base">
          {history.entries.map((entry, index) => {
            const isCurrent = index === history.index;
            // Anything past the pointer is a branch the next edit will discard.
            const isAhead = index > history.index;

            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => actions.jumpToHistory(entry.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                    isCurrent
                      ? "bg-primary/10 text-foreground"
                      : "hover:bg-raised",
                    isAhead && "opacity-50"
                  )}
                >
                  <span className="tabnum w-6 shrink-0 text-xs text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {displayHistoryLabel(locale, entry.label)}
                  </span>
                  <span className="tabnum shrink-0 text-xs text-muted-foreground">
                    {new Date(entry.at).toLocaleTimeString(locale === "th" ? "th-TH" : "en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  {isCurrent ? (
                    <Check className="size-4 shrink-0 text-primary" />
                  ) : (
                    <span className="size-4 shrink-0" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
