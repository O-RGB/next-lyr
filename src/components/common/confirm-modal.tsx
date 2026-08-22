"use client";

import { AlertTriangle, Info } from "lucide-react";

import ButtonCommon from "@/components/common/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUiStore } from "@/features/ui/ui-store";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";

export default function ConfirmModal() {
  const request = useUiStore((state) => state.confirmRequest);
  const resolveConfirm = useUiStore((state) => state.resolveConfirm);
  const isDanger = request?.tone === "danger";
  const isAlert = request?.kind === "alert";
  const locale = useSettingsStore((state) => state.uiLocale);

  return (
    <AlertDialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) resolveConfirm(false);
      }}
    >
      <AlertDialogContent
        size="sm"
        className="z-[70] border border-line bg-panel shadow-2xl"
      >
        <AlertDialogHeader>
          <AlertDialogMedia
            className={
              isDanger
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary"
            }
          >
            {isDanger ? <AlertTriangle /> : <Info />}
          </AlertDialogMedia>
          <AlertDialogTitle>
            {request?.title ?? text(locale, "ยืนยันการทำงาน", "Confirm action")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {request?.description ?? text(locale, "ต้องการดำเนินการต่อหรือไม่?", "Do you want to continue?")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          {!isAlert && (
            <ButtonCommon
              color="gray"
              variant="outline"
              size="sm"
              onClick={() => resolveConfirm(false)}
            >
              {request?.cancelLabel ?? text(locale, "ยกเลิก", "Cancel")}
            </ButtonCommon>
          )}
          <ButtonCommon
            color={isDanger ? "danger" : "primary"}
            size="sm"
            onClick={() => resolveConfirm(true)}
          >
            {request?.confirmLabel ??
              (isAlert
                ? text(locale, "รับทราบ", "OK")
                : text(locale, "ยืนยัน", "Confirm"))}
          </ButtonCommon>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
