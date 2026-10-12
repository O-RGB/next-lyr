"use client";

import { GripVertical } from "lucide-react";
import { StickerImage } from "@/components/lyrics/sticker-image";
import type { LyricCellDraft } from "@/lib/karaoke/inline-content";

/** A drag-only copy can leave the modal without moving its timestamp slot. */
export function LyricDragPreview({ cell, width, projectId }: { cell: LyricCellDraft; width: number; projectId: string | null }) {
  return <div aria-hidden="true" data-editor-drag-preview style={{ width }}
    className="pointer-events-none flex min-h-11 items-center gap-2 rounded-md border border-primary bg-panel px-2 py-2 shadow-lg">
    <GripVertical className="size-4 shrink-0 text-muted-foreground" />
    {cell.kind === "image" && cell.sticker && projectId
      ? <><StickerImage projectId={projectId} sticker={cell.sticker} size={32} /><span className="truncate text-xs">{cell.sticker.name}</span></>
      : <div className="min-w-0 flex-1"><div className="truncate whitespace-pre text-sm">{cell.text}</div>
        {cell.vocal && <div className="truncate text-xs text-muted-foreground">{cell.vocal}</div>}</div>}
  </div>;
}
