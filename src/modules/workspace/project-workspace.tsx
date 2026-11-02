"use client";

import { useState } from "react";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import LyricsPreview from "@/modules/lyrics-editor/lyrics-preview";
import LyricsEditorPanel from "@/modules/lyrics-editor";
import AllowSound from "@/components/providers/allow-sound";
import { ProjectSidebar } from "./project-sidebar";

export function ProjectWorkspace() {
  const locale = useSettingsStore((state) => state.uiLocale);
  const [preview, setPreview] = useState(true);

  return (
    <AllowSound>
      <div className="editor-workspace flex h-full min-h-0 w-full flex-col overflow-hidden lg:flex-row">
        <section className="order-2 min-h-0 flex-1 overflow-hidden lg:order-1">
          <div className={preview ? "h-full lg:h-[70%]" : "h-full"}>
            <LyricsEditorPanel onPreviewChange={setPreview} />
          </div>
          {preview ? (
            <div className="editor-preview hidden h-[30%] items-center justify-center overflow-auto bg-lane ring-1 ring-line-soft lg:flex">
              <span className="editor-section-label">{text(locale, "ตัวอย่างเนื้อร้อง", "LYRICS PREVIEW")}</span>
              <LyricsPreview />
            </div>
          ) : null}
        </section>
        <ProjectSidebar preview={preview} />
      </div>
    </AllowSound>
  );
}

export default ProjectWorkspace;
