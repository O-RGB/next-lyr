"use client";

import { useState } from "react";
import LyricsPreview from "@/modules/lyrics-editor/lyrics-preview";
import LyricsEditorPanel from "@/modules/lyrics-editor";
import AllowSound from "@/components/providers/allow-sound";
import { ProjectSidebar } from "./project-sidebar";

export function ProjectWorkspace() {
  const [preview, setPreview] = useState(false);

  return (
    <AllowSound>
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden lg:flex-row">
        <section className="order-2 min-h-0 flex-1 overflow-hidden lg:order-1">
          <div className="h-full lg:h-[70%]">
            <LyricsEditorPanel onPreviewChange={setPreview} />
          </div>
          <div className="hidden h-[30%] items-center justify-center overflow-auto bg-gradient-to-r from-violet-200 to-pink-300 lg:flex">
            <LyricsPreview />
          </div>
        </section>
        <ProjectSidebar preview={preview} />
      </div>
    </AllowSound>
  );
}

export default ProjectWorkspace;
