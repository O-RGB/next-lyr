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

export default function ConfirmModal() {
  const request = useUiStore((state) => state.confirmRequest);
  const resolveConfirm = useUiStore((state) => state.resolveConfirm);
  const isDanger = request?.tone === "danger";
  const isAlert = request?.kind === "alert";

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
            {request?.title ?? "ยืนยันการทำงาน"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {request?.description ?? "ต้องการดำเนินการต่อหรือไม่?"}
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
              {request?.cancelLabel ?? "ยกเลิก"}
            </ButtonCommon>
          )}
          <ButtonCommon
            color={isDanger ? "danger" : "primary"}
            size="sm"
            onClick={() => resolveConfirm(true)}
          >
            {request?.confirmLabel ?? (isAlert ? "รับทราบ" : "ยืนยัน")}
          </ButtonCommon>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
