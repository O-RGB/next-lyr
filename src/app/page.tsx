"use client";

import { AlertTriangle, MicVocal } from "lucide-react";
import React from "react";
import { toast } from "sonner";

import NavBar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { deleteAllProjects } from "@/lib/database/db";
import { useSettingsStore } from "@/features/settings/settings-store";
import { text } from "@/features/settings/locale";
import { useUiStore } from "@/features/ui/ui-store";

export default function Home() {
  const locale = useSettingsStore((state) => state.uiLocale);
  const requestConfirm = useUiStore((state) => state.requestConfirm);

  const handleReset = async () => {
    try {
      await deleteAllProjects();
      toast.success("ล้างข้อมูลเรียบร้อย", {
        description: "รีเฟรชหน้าเว็บเพื่อเริ่มใหม่",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const handleRequestReset = async () => {
    const confirmed = await requestConfirm({
      title: text(locale, "ล้างข้อมูลทั้งหมดหรือไม่?", "Clear all data?"),
      description: text(
        locale,
        "โปรเจกต์ทุกอันที่เก็บอยู่ในเครื่องจะถูกลบและกู้คืนไม่ได้",
        "Every project stored on this device will be deleted and cannot be recovered"
      ),
      tone: "danger",
      confirmLabel: text(locale, "ล้างข้อมูล", "Clear data"),
    });
    if (confirmed) await handleReset();
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
              onClick={() => void handleRequestReset()}
            >
              <AlertTriangle />
              {text(locale, "ล้างข้อมูลทั้งหมด", "Clear all data")}
            </Button>
          </div>
        </div>
      </main>

    </div>
  );
}
