"use client";

import { ArrowDown, ArrowUp, GripVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import type { LyricCellDraft } from "@/lib/karaoke/inline-content";
import { StickerImage } from "@/components/lyrics/sticker-image";
import InputCommon from "@/components/common/data-input/input";
import ButtonCommon from "@/components/common/button";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";

export function SortableLyricCell({ cell, ordinal, count, at, projectId, midi, onEdit, onMove, onRemove, onFocus, inputRef }: {
  cell: LyricCellDraft; ordinal: number; count: number; at: number | null;
  projectId: string | null; midi: boolean;
  onEdit: (field: "text" | "vocal", value: string) => void;
  onMove: (delta: number) => void; onRemove: () => void; onFocus: () => void;
  inputRef: (node: HTMLInputElement | null) => void;
}) {
  const locale = useSettingsStore((state) => state.uiLocale);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: cell.key });
  return (
    <div data-editor-cell={cell.key} data-kind={cell.kind} className="flex items-center gap-2 border-b border-line/60 py-1 last:border-b-0">
      {/* Slot/time stay fixed while only the content region animates. */}
      <div className="w-12 shrink-0 text-center">
        <span className="text-[11px] font-semibold text-brand-2">{ordinal + 1}</span>
        <div data-slot-time={at ?? "untimed"} className="truncate text-[9px] tabular-nums text-muted-foreground">
          {at === null ? "—" : `${Number(at.toFixed(3))}${midi ? "t" : "s"}`}
        </div>
      </div>
      <div ref={setNodeRef} onFocusCapture={onFocus}
        style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
          transition, zIndex: isDragging ? 10 : undefined }}
        className={`relative flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-panel ${isDragging ? "shadow-lg ring-1 ring-primary" : ""}`}>
        <button ref={setActivatorNodeRef} {...attributes} {...listeners} type="button"
          aria-label={text(locale, `ลากรายการที่ ${ordinal + 1}`, `Drag item ${ordinal + 1}`)}
          className="grid h-11 w-7 shrink-0 cursor-grab touch-none place-items-center text-muted-foreground active:cursor-grabbing">
          <GripVertical className="size-4" />
        </button>
        {cell.kind === "image" && cell.sticker && projectId ? (
          <div data-image-cell className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-base px-2">
            <StickerImage projectId={projectId} sticker={cell.sticker} size={32} />
            <span className="truncate text-[10px] text-muted-foreground">{text(locale, "รูป", "Image")} · {Math.ceil(cell.sticker.bytes / 1000)} KB</span>
          </div>
        ) : (
          <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,0.65fr)] gap-1.5">
            <InputCommon ref={inputRef} inputSize="sm" aria-label={text(locale, `คำร้องช่อง ${ordinal + 1}`, `Lyrics slot ${ordinal + 1}`)}
              placeholder={text(locale, "คำร้อง", "Lyrics")} value={cell.text} onChange={(event) => onEdit("text", event.target.value)} />
            <InputCommon inputSize="sm" aria-label={text(locale, `ซับช่อง ${ordinal + 1}`, `Subtitle slot ${ordinal + 1}`)}
              placeholder={text(locale, "ซับ", "Subtitle")} value={cell.vocal} onChange={(event) => onEdit("vocal", event.target.value)} />
          </div>
        )}
        <div className="flex shrink-0 flex-col">
          <button type="button" disabled={ordinal === 0} onClick={() => onMove(-1)}
            aria-label={text(locale, `ย้ายรายการ ${ordinal + 1} ขึ้น`, `Move item ${ordinal + 1} up`)}
            className="grid h-5 w-6 place-items-center text-muted-foreground disabled:opacity-25"><ArrowUp className="size-3" /></button>
          <button type="button" disabled={ordinal === count - 1} onClick={() => onMove(1)}
            aria-label={text(locale, `ย้ายรายการ ${ordinal + 1} ลง`, `Move item ${ordinal + 1} down`)}
            className="grid h-5 w-6 place-items-center text-muted-foreground disabled:opacity-25"><ArrowDown className="size-3" /></button>
        </div>
        <ButtonCommon type="button" circle size="xs" className="!size-7" color="danger" variant="ghost"
          icon={<Trash2 />} onClick={onRemove} aria-label={text(locale, `ลบรายการ ${ordinal + 1}`, `Delete item ${ordinal + 1}`)} />
      </div>
    </div>
  );
}
