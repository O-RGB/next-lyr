"use client";

import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HistoryPanel } from "@/features/history/history-panel";
import {
  SettingsDialog,
  ShortcutsDialog,
} from "@/features/settings/settings-dialog";
import { LyricsEditorRuntime } from "@/modules/lyrics-editor";
import ProjectWorkspace from "@/modules/workspace";
import { ProjectDialogs } from "./project-dialogs";
import { ProjectToolbar } from "./project-toolbar";
import { useProjectLoader } from "./use-project-loader";
import { useSettingsStore } from "@/features/settings/settings-store";
import { text } from "@/features/settings/locale";

export function ProjectPage({ projectId }: { projectId: string }) {
  const project = useProjectLoader(projectId);
  const locale = useSettingsStore((state) => state.uiLocale);

  if (project.status === "loading") {
    return (
      <div className="flex h-dvh items-center justify-center bg-base">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {text(locale, "กำลังเปิดโปรเจกต์...", "Opening project...")}
        </div>
      </div>
    );
  }

  if (project.status === "error") {
    return (
      <div className="flex h-dvh items-center justify-center bg-base p-6">
        <div className="max-w-md border border-line bg-panel p-6 text-center shadow-sm">
          <span className="mx-auto mb-3 grid size-11 place-items-center bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </span>
          <h1 className="text-base font-semibold text-foreground">
            {text(locale, "เปิดโปรเจกต์ไม่สำเร็จ", "Could not open project")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{project.error}</p>
          <Button className="mt-5" size="sm" onClick={project.reload}>
            <RotateCcw />
            {text(locale, "ลองใหม่", "Try again")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <ProjectToolbar />
      <main className="min-h-0 flex-1">
        <ProjectWorkspace />
      </main>
      <ProjectDialogs />
      <HistoryPanel />
      <SettingsDialog />
      <ShortcutsDialog />
      <LyricsEditorRuntime />
    </div>
  );
}

export default ProjectPage;
