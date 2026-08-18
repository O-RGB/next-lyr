"use client";

import MetadataPanel from "@/modules/song-metadata";
import { EditorPlayerSlot } from "@/modules/playback";

export function ProjectSidebar({ preview }: { preview: boolean }) {
  return (
    <aside className="flex shrink-0 flex-col lg:w-[300px] lg:border-l lg:border-line lg:bg-panel lg:p-4">
      <div
        className={`hidden fixed left-0 right-2 z-10 w-full px-2 lg:block lg:static lg:w-auto lg:px-0 ${
          preview ? "top-[203px]" : "top-20"
        }`}
      >
        <EditorPlayerSlot preview={preview} />
      </div>
      <div className="hidden min-h-0 flex-1 overflow-auto lg:block">
        <MetadataPanel />
      </div>
    </aside>
  );
}
