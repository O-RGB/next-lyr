"use client";

import { Captions, Plus, Save, Undo2, Redo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DndContext, closestCenter, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import ButtonCommon from "@/components/common/button";
import ModalCommon from "@/components/common/modal";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { ThaiKaraoke } from "@/lib/thai-karaoke";
import { IMAGE_TOKEN, cellsFromLine, moveCellContent, type LyricCellDraft } from "@/lib/karaoke/inline-content";
import type { LyricSticker } from "@/lib/stickers/types";
import LineStickerPanel from "./line-sticker-panel";
import { BlockEffectPanel, QuickBlockEffectControls } from "./block-effect-panel";
import type { EffectType } from "@/lib/block-effects/types";
import { SortableLyricCell } from "./sortable-lyric-cell";

interface DraftHistory { past: LyricCellDraft[][]; present: LyricCellDraft[]; future: LyricCellDraft[][] }
const emptyHistory = (): DraftHistory => ({ past: [], present: [], future: [] });

export default function EditLyricLineModal({ open }: { open?: boolean }) {
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex);
  const currentLine = useKaraokeStore((state) => selectedLineIndex === null ? undefined : state.lyricsData[selectedLineIndex]);
  const projectId = useKaraokeStore((state) => state.projectId);
  const actions = useKaraokeStore((state) => state.actions);
  const mode = useKaraokeStore((state) => state.mode);
  const locale = useSettingsStore((state) => state.uiLocale);
  const [history, setHistory] = useState<DraftHistory>(emptyHistory);
  const [selected, setSelected] = useState(new Set<string>());
  const [stickerBusy, setStickerBusy] = useState(false);
  const sessionRef = useRef<string | null>(null);
  const cacheRef = useRef(new Map<string, DraftHistory>());
  const inputsRef = useRef(new Map<string, HTMLInputElement>());
  const focusedRef = useRef<string | null>(null);
  const nextKeyRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const dropPointRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!open) return;
    const mouse = (event: MouseEvent) => { dropPointRef.current = { x: event.clientX, y: event.clientY }; };
    const touch = (event: TouchEvent) => { const point = event.changedTouches[0]; if (point) dropPointRef.current = { x: point.clientX, y: point.clientY }; };
    document.addEventListener("mouseup", mouse, true);
    document.addEventListener("touchend", touch, true);
    return () => { document.removeEventListener("mouseup", mouse, true); document.removeEventListener("touchend", touch, true); };
  }, [open]);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!open || !currentLine || selectedLineIndex === null) return;
    const key = JSON.stringify([projectId, selectedLineIndex, currentLine]);
    if (sessionRef.current !== key) {
      sessionRef.current = key;
      const initial = cellsFromLine(currentLine);
      setSelected(new Set());
      setHistory(cacheRef.current.get(key) ?? { past: [], present: initial, future: [] });
      focusedRef.current = initial.find((cell) => cell.originalIndex === useKaraokeStore.getState().currentIndex)?.key ?? initial[0]?.key ?? null;
    }
    const frame = requestAnimationFrame(() => {
      const input = focusedRef.current && inputsRef.current.get(focusedRef.current);
      if (input) { input.focus(); input.select(); }
    });
    return () => cancelAnimationFrame(frame);
  }, [open, currentLine, selectedLineIndex, projectId]);

  const change = (update: (cells: LyricCellDraft[]) => LyricCellDraft[]) => setHistory((previous) => ({
    past: [...previous.past, previous.present].slice(-80), present: update(previous.present), future: [],
  }));
  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= history.present.length) return;
    change((cells) => moveCellContent(cells, from, to));
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const from = history.present.findIndex((cell) => cell.key === active.id);
    let to = over ? history.present.findIndex((cell) => cell.key === over.id) : from;
    // Fixed slot rows give an exact final drop position, including quick mouse
    // gestures whose last movement lands before dnd-kit's next layout frame.
    const point = dropPointRef.current;
    const rows = listRef.current?.querySelectorAll<HTMLElement>("[data-editor-cell]");
    if (point && rows?.length) {
      const bounds = listRef.current!.getBoundingClientRect();
      if (point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom) {
        let distance = Infinity;
        rows.forEach((row, index) => { const box = row.getBoundingClientRect(); const next = Math.abs(point.y - box.top - box.height / 2); if (next < distance) { distance = next; to = index; } });
      }
    }
    dropPointRef.current = null;
    move(from, to);
  };
  const insert = (kind: "text" | "image", sticker?: LyricSticker) => {
    const cell: LyricCellDraft = { key: `new-${nextKeyRef.current++}`, originalIndex: null, kind,
      text: kind === "image" ? IMAGE_TOKEN : "", vocal: "", sticker };
    const focusedKey = focusedRef.current;
    change((cells) => {
      const focused = cells.findIndex((item) => item.key === focusedKey);
      const next = [...cells];
      next.splice(focused >= 0 ? focused + 1 : next.length, 0, cell);
      return next;
    });
    focusedRef.current = cell.key;
    if (kind === "text") requestAnimationFrame(() => inputsRef.current.get(cell.key)?.focus());
  };
  const undo = () => setHistory((previous) => {
    const last = previous.past.at(-1);
    return last ? { past: previous.past.slice(0, -1), present: last, future: [previous.present, ...previous.future] } : previous;
  });
  const redo = () => setHistory((previous) => {
    const next = previous.future[0];
    return next ? { past: [...previous.past, previous.present].slice(-80), present: next, future: previous.future.slice(1) } : previous;
  });
  const serialize = (cells: LyricCellDraft[]) => cells.map(({ originalIndex, kind, text, vocal, sticker, effect }) => ({ originalIndex, kind, text, vocal, sticker, effect }));
  const applyEffect = (type: EffectType | "none") => change((cells) => cells.map((cell) => selected.has(cell.key)
    ? { ...cell, effect: type === "none" ? undefined : { type, connected: cell.effect?.connected !== false } } : cell));
  const connectEffects = (connected: boolean) => change((cells) => cells.map((cell) => selected.has(cell.key) && cell.effect ? { ...cell, effect: { ...cell.effect, connected } } : cell));
  const invalid = history.present.some((cell) => cell.kind === "image" ? !cell.sticker : !cell.text.trim());
  const dirty = currentLine && JSON.stringify(serialize(history.present)) !== JSON.stringify(serialize(cellsFromLine(currentLine)));
  const hasNewCells = history.present.some((cell) => cell.originalIndex === null);
  const close = () => {
    if (sessionRef.current) cacheRef.current.set(sessionRef.current, history);
    actions.closeEditModal();
  };
  const save = async () => {
    if (selectedLineIndex === null || !currentLine || invalid || !dirty || stickerBusy) return;
    const state = useKaraokeStore.getState();
    const wasTiming = state.isTimingActive || state.editingLineIndex !== null;
    if (sessionRef.current) cacheRef.current.delete(sessionRef.current);
    sessionRef.current = null;
    actions.replaceLineWords(selectedLineIndex, history.present);
    const persistence = wasTiming ? actions.saveTimingDraft() : actions.saveCurrentProject();
    actions.closeEditModal();
    try {
      const handlers = usePlayerHandlersStore.getState();
      await Promise.all([persistence, wasTiming ? handlers.handleResumeTiming() : hasNewCells ? handlers.handleContinueTiming() : Promise.resolve()]);
    } catch (error) {
      usePlayerHandlersStore.getState().handlePauseTiming();
      toast.error(text(locale, "บันทึกไม่สำเร็จ งานที่แก้ยังอยู่ในหน้านี้", "Could not save; your edits are still on this page"));
      console.error(error);
    }
  };

  return <ModalCommon open={!!open && selectedLineIndex !== null} onClose={close}
    title={text(locale, "แก้ไขคำร้อง", "Edit lyrics")}
    description={text(locale, "ลากคำหรือรูปเพื่อเรียงเนื้อหา เวลาอยู่กับช่องเดิม", "Drag words or images to reorder content. Timestamps stay in their slots.")}
    modalClassName="flex flex-col"
    footer={<div className="flex w-full flex-col">
      <QuickBlockEffectControls cells={history.present} selected={selected} onApply={applyEffect} onConnect={connectEffects} />
      <ButtonCommon className="w-full sm:ml-auto sm:w-auto" icon={<Save />} color={hasNewCells ? "warning" : "primary"}
      disabled={!dirty || invalid || stickerBusy} onClick={() => void save()}>
      {hasNewCells ? text(locale, "บันทึกและปาดต่อ", "Save & continue timing") : text(locale, "บันทึก", "Save")}
    </ButtonCommon></div>}>
    <div className="space-y-3">
      {projectId && open && selectedLineIndex !== null && <LineStickerPanel key={`${projectId}:${selectedLineIndex}`}
        projectId={projectId} onChange={(sticker) => { if (sticker) insert("image", sticker); }} onBusyChange={setStickerBusy} />}
      <BlockEffectPanel cells={history.present} selected={selected}
        onSelectAll={() => setSelected(selected.size === history.present.length ? new Set() : new Set(history.present.map((cell) => cell.key)))}
        onApply={applyEffect} onConnect={connectEffects} />
      <div className="rounded-xl border border-line bg-panel p-2 shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-line pb-2 text-xs text-muted-foreground">
          <span>{text(locale, "บรรทัดที่", "Line")} {(selectedLineIndex ?? 0) + 1} · {history.present.length} {text(locale, "รายการ", "items")}</span>
          <div className="flex gap-1">
            <ButtonCommon circle size="xs" className="!size-7" variant="ghost" color="gray" icon={<Undo2 />} disabled={!history.past.length} onClick={undo} aria-label={text(locale, "ย้อนกลับ", "Undo")} />
            <ButtonCommon circle size="xs" className="!size-7" variant="ghost" color="gray" icon={<Redo2 />} disabled={!history.future.length} onClick={redo} aria-label={text(locale, "ทำซ้ำ", "Redo")} />
            <ButtonCommon circle size="xs" className="!size-7" color="success" icon={<Captions />} aria-label={text(locale, "เติมซับอัตโนมัติ", "Auto-fill subtitles")}
              onClick={() => change((cells) => cells.map((cell) => cell.kind === "text" ? { ...cell, vocal: ThaiKaraoke.getInstance().transliterate(cell.text).toUpperCase() } : cell))} />
          </div>
        </div>
        <DndContext sensors={sensors} modifiers={[restrictToVerticalAxis]} collisionDetection={closestCenter}
          onDragStart={() => { dropPointRef.current = null; }} onDragEnd={onDragEnd}>
          <div ref={listRef}>
          <SortableContext items={history.present.map((cell) => cell.key)} strategy={verticalListSortingStrategy}>
            {history.present.map((cell, index) => {
              const original = currentLine?.find((word) => word.index === cell.originalIndex);
              const buffered = cell.originalIndex === null ? undefined : useKaraokeStore.getState().timingBuffer?.buffer.get(cell.originalIndex)?.at;
              return <SortableLyricCell key={cell.key} cell={cell} selected={selected.has(cell.key)}
                onSelect={() => setSelected((previous) => { const next = new Set(previous); if (next.has(cell.key)) next.delete(cell.key); else next.add(cell.key); return next; })} ordinal={index} count={history.present.length} projectId={projectId} midi={mode === "midi"}
                at={buffered ?? original?.at ?? null} onFocus={() => { focusedRef.current = cell.key; }}
                inputRef={(node) => { if (node) inputsRef.current.set(cell.key, node); else inputsRef.current.delete(cell.key); }}
                onMove={(delta) => move(index, index + delta)} onRemove={() => { setSelected((previous) => { const next = new Set(previous); next.delete(cell.key); return next; }); change((cells) => cells.filter((item) => item.key !== cell.key)); }}
                onEdit={(field, value) => change((cells) => cells.map((item) => item.key === cell.key ? { ...item, [field]: value } : item))} />;
            })}
          </SortableContext>
          </div>
        </DndContext>
        <div className="mt-2 flex justify-end border-t border-line pt-2">
          <ButtonCommon size="xs" color="secondary" variant="outline" icon={<Plus />} onClick={() => insert("text")}>{text(locale, "เพิ่มคำ", "Add word")}</ButtonCommon>
        </div>
      </div>
    </div>
  </ModalCommon>;
}
