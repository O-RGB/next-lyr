"use client";

import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import type { LyricCellDraft } from "@/lib/karaoke/inline-content";
import { StickerImage } from "@/components/lyrics/sticker-image";
import VisibleSpaceInput from "@/components/common/data-input/visible-space-input";
import ButtonCommon from "@/components/common/button";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";

export function SortableLyricCell({ cell, ordinal, projectId, onEdit, onRemove, onReplaceImage, onFocus, inputRef, selected, onSelect }: {
  selected: boolean; onSelect: () => void;
  cell: LyricCellDraft; ordinal: number; projectId: string | null;
  onEdit: (field: "text" | "vocal", value: string) => void;
  onRemove: () => void; onFocus: () => void;
  onReplaceImage: () => void;
  inputRef: (node: HTMLInputElement | null) => void;
}) {
  const locale = useSettingsStore((state) => state.uiLocale);
  const { attributes, listeners, setDraggableNodeRef, setDroppableNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: cell.key, data: { lyricDrop: { kind: "row", index: ordinal, effect: cell.effect } },
  });
  return (
    <div ref={setDroppableNodeRef} data-editor-cell={cell.key} data-editor-drop-id={cell.key} data-kind={cell.kind} data-editor-effect={cell.effect?.type ?? "none"} className="flex items-center gap-2 border-b border-line/60 py-1 last:border-b-0">
      {/* Only the content region moves; timestamp slots stay in the data. */}
      <div className="w-9 shrink-0 text-center sm:w-12">
        <label className="flex min-h-11 items-center justify-center gap-1">
          <input type="checkbox" checked={selected} onChange={onSelect}
            aria-label={text(locale, `เลือกบล็อก ${ordinal + 1}`, `Select block ${ordinal + 1}`)} />
          <span className="text-[11px] font-semibold text-brand-2">{ordinal + 1}</span>
        </label>
      </div>
      <div ref={setDraggableNodeRef} onFocusCapture={onFocus}
        style={{ transform: !isDragging && transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
          transition, zIndex: isDragging ? 10 : undefined }}
        className={`relative flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-panel ${isDragging ? "opacity-30" : ""}`}>
        <button ref={setActivatorNodeRef} {...attributes} {...listeners} type="button" data-editor-drag-handle
          aria-label={text(locale, `ลากรายการที่ ${ordinal + 1}`, `Drag item ${ordinal + 1}`)}
          className="grid h-11 w-7 shrink-0 cursor-grab touch-none place-items-center text-muted-foreground active:cursor-grabbing">
          <GripVertical className="size-4" />
        </button>
        {cell.kind === "image" && cell.sticker && projectId ? (
          <button type="button" data-image-cell onClick={onReplaceImage}
            aria-label={text(locale, `เปลี่ยนรูป ${cell.sticker.name}`, `Edit image ${cell.sticker.name}`)}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-base px-2 text-left hover:bg-panel-2 focus-visible:outline-2 focus-visible:outline-primary">
            <StickerImage projectId={projectId} sticker={cell.sticker} size={32} />
            <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground" title={cell.sticker.name}>{cell.sticker.name}</span>
            <Pencil className="size-3 shrink-0" />
          </button>
        ) : (
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-1 py-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.65fr)] sm:gap-1.5">
            <VisibleSpaceInput ref={inputRef} inputSize="sm" aria-label={text(locale, `คำร้องช่อง ${ordinal + 1}`, `Lyrics slot ${ordinal + 1}`)}
              placeholder={text(locale, "คำร้อง", "Lyrics")} value={cell.text} onChange={(event) => onEdit("text", event.target.value)} />
            <VisibleSpaceInput inputSize="sm" aria-label={text(locale, `ซับช่อง ${ordinal + 1}`, `Subtitle slot ${ordinal + 1}`)}
              placeholder={text(locale, "ซับ", "Subtitle")} value={cell.vocal} onChange={(event) => onEdit("vocal", event.target.value)} />
          </div>
        )}
        <ButtonCommon type="button" circle size="xs" className="!size-7" color="danger" variant="ghost"
          icon={<Trash2 />} onClick={onRemove} aria-label={text(locale, `ลบรายการ ${ordinal + 1}`, `Delete item ${ordinal + 1}`)} />
      </div>
    </div>
  );
}
