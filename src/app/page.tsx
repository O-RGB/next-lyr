"use client";

import { AlertTriangle, MicVocal } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

import NavBar from "@/components/navbar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteAllProjects } from "@/lib/database/db";
import { useSettingsStore } from "@/features/settings/settings-store";
import { text } from "@/features/settings/locale";

export default function Home() {
  const [confirmReset, setConfirmReset] = useState(false);
  const locale = useSettingsStore((state) => state.uiLocale);

  const handleReset = async () => {
    setConfirmReset(false);
    try {
      await deleteAllProjects();
      toast.success("ล้างข้อมูลเรียบร้อย", {
        description: "รีเฟรชหน้าเว็บเพื่อเริ่มใหม่",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="app-shell">
      <header className="z-50 shrink-0 border-b border-line bg-panel/95 backdrop-blur-xl">
        <NavBar />
      </header>

      <main className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <span className="mx-auto mb-4 grid size-14 place-items-center rounded-xl bg-primary/15 text-primary">
            <MicVocal className="size-7" />
          </span>

          <h2 className="text-xl font-semibold text-foreground">
            Next Lyrics Editor
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {text(locale, "เปิดโปรเจกต์เดิม หรือสร้างโปรเจกต์ใหม่เพื่อเริ่มทำเนื้อเพลง", "Open an existing project or create a new one to start editing lyrics")}
          </p>

          <div className="mt-8 border-t border-line pt-6">
            <p className="text-xs text-muted-foreground">
              {text(locale, "ถ้าโปรแกรมทำงานผิดปกติ ให้ล้างข้อมูลก่อนใช้งานต่อ", "If the app behaves unexpectedly, clear local data before continuing")}
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="mt-3"
              onClick={() => setConfirmReset(true)}
            >
              <AlertTriangle />
              {text(locale, "ล้างข้อมูลทั้งหมด", "Clear all data")}
            </Button>
          </div>
        </div>
      </main>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
          <AlertDialogTitle>{text(locale, "ล้างข้อมูลทั้งหมด?", "Clear all data?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {text(locale, "โปรเจกต์ทุกอันที่เก็บอยู่ในเครื่องจะถูกลบและกู้คืนไม่ได้", "Every project stored on this device will be deleted and cannot be recovered")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{text(locale, "ยกเลิก", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleReset}>
              {text(locale, "ล้างข้อมูล", "Clear data")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
