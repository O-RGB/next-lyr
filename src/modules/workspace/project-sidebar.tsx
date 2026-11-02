"use client";

import { FileMusic } from "lucide-react";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import MetadataPanel from "@/modules/song-metadata";
import { EditorPlayerSlot } from "@/modules/playback";

export function ProjectSidebar({ preview }: { preview: boolean }) {
  const locale = useSettingsStore((state) => state.uiLocale);
  return (
    <aside className="editor-sidebar flex shrink-0 flex-col lg:w-[300px] lg:bg-panel lg:p-4">
      <h2 className="editor-sidebar-heading hidden lg:flex"><FileMusic className="size-4" />{text(locale, "ข้อมูลเพลง", "Song details")}</h2>
      <div
        className={`hidden fixed left-0 right-2 z-10 w-full px-2 lg:block lg:static lg:w-auto lg:px-0 ${
          preview ? "top-[203px]" : "top-20"
        }`}
      >
        <EditorPlayerSlot preview={preview} />
      </div>
      <div className="hidden min-h-0 flex-1 overflow-auto lg:block">
        <MetadataPanel
          card={false}
          requiredFirst
          className="flex flex-col gap-2"
          showRequiredErrors
        />
      </div>
    </aside>
  );
}
