"use client";

import { useState } from "react";
import LyricsPlayer from "@/components/lyrics/karaoke-lyrics";
import AllowSound from "@/components/providers/allow-sound";
import { EditorLyricsPanel } from "./editor-lyrics-panel";
import { EditorSidebar } from "./editor-sidebar";

export function EditorWorkspace() {
  const [preview, setPreview] = useState(false);

  return (
    <AllowSound>
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden lg:flex-row">
        <section className="order-2 min-h-0 flex-1 overflow-hidden lg:order-1">
          <div className="h-full lg:h-[70%]">
            <EditorLyricsPanel onPreviewChange={setPreview} />
          </div>
          <div className="hidden h-[30%] items-center justify-center overflow-auto bg-gradient-to-r from-violet-200 to-pink-300 lg:flex">
            <LyricsPlayer />
          </div>
        </section>
        <EditorSidebar preview={preview} />
      </div>
    </AllowSound>
  );
}
