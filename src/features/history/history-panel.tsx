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
import { cn } from "@/lib/utils";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { canRedo, canUndo } from "@/stores/karaoke-store/history";

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

  return (
    <Dialog
      open={dialog === "history"}
      onOpenChange={(next) => openDialog(next ? "history" : null)}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ประวัติการแก้ไข</DialogTitle>
          <DialogDescription>
            กดที่รายการเพื่อย้อนกลับไปยังจุดนั้น
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
            ย้อนกลับ
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!canRedo(history)}
            onClick={actions.redo}
          >
            <Redo2 />
            ทำซ้ำ
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
                  <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                  <span className="tabnum shrink-0 text-xs text-muted-foreground">
                    {new Date(entry.at).toLocaleTimeString("th-TH", {
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
