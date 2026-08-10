"use client";

import { EditorDialogs } from "./editor-dialogs";
import { EditorRuntime } from "./editor-runtime";
import { EditorToolbar } from "./editor-toolbar";
import { EditorWorkspace } from "./editor-workspace";

export function EditorShell() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-gray-100">
      <EditorToolbar />
      <main className="min-h-0 flex-1">
        <EditorWorkspace />
      </main>
      <EditorDialogs />
      <EditorRuntime />
    </div>
  );
}
