"use client";

import { Captions, Plus, Save, Undo2, Redo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { DndContext, DragOverlay, closestCenter, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, type CollisionDetection, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import ButtonCommon from "@/components/common/button";
import ModalCommon from "@/components/common/modal";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { ThaiKaraoke } from "@/lib/thai-karaoke";
import { IMAGE_TOKEN, cellsFromLine, insertCellAfter, dropCellContent, replaceCellImage, type LyricCellDraft } from "@/lib/karaoke/inline-content";
import type { LyricSticker } from "@next-karaoke/lyrics/media";
import { BlockEffectPanel, EffectSelectionToolbar } from "./block-effect-panel";
import { type BlockEffect, type EffectRun } from "@next-karaoke/lyrics/effects";
import { applySelectedEffect, resolveEffectSelection, selectionAfterDraftHistory } from "@next-karaoke/lyrics/effects";
import { SortableLyricCell } from "./sortable-lyric-cell";
import { LyricContentDrawer } from "./lyric-content-drawer";
import { LyricDraftPreview } from "./lyric-draft-preview";
import { EffectCellList } from "./effect-cell-list";
import { lyricKeyboardCoordinates } from "./keyboard-coordinates";
import { dropDestination, releaseDropTarget, resolveDragTarget, type DisplayedDropTarget, type LyricDropTarget } from "./drop-targets";
import { editorDropViewport, LyricDropIndicator, paintDropIndicator } from "./lyric-drop-indicator";
import { LyricDragPreview } from "./lyric-drag-preview";

interface DraftHistory { past: LyricCellDraft[][]; present: LyricCellDraft[]; future: LyricCellDraft[][] }
const emptyHistory = (): DraftHistory => ({ past: [], present: [], future: [] });
type ContentTarget = ({ kind: "add"; afterKey: string | null } | { kind: "replace"; key: string }) & { open: boolean };

export default function EditLyricLineModal({ open }: { open?: boolean }) {
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex);
  const currentLine = useKaraokeStore((state) => selectedLineIndex === null ? undefined : state.lyricsData[selectedLineIndex]);
  const projectId = useKaraokeStore((state) => state.projectId);
  const actions = useKaraokeStore((state) => state.actions);
  const timingSessionOpen = useKaraokeStore((state) => state.isTimingActive || state.editingLineIndex !== null);
  const editEffectIndices = useKaraokeStore((state) => state.editEffectIndices);
  const locale = useSettingsStore((state) => state.uiLocale);
  const [history, setHistory] = useState<DraftHistory>(emptyHistory);
  const [selected, setSelected] = useState(new Set<string>());
  const [stickerBusy, setStickerBusy] = useState(false);
  const [contentTarget, setContentTarget] = useState<ContentTarget | null>(null);
  const [effectDrawerOpen, setEffectDrawerOpen] = useState(false);
  const [dragging, setDragging] = useState<{ key: string; width: number } | null>(null);
  const sessionRef = useRef<string | null>(null);
  const cacheRef = useRef(new Map<string, DraftHistory>());
  const selectionCacheRef = useRef(new Map<string, { keys: Set<string>; followGroup: boolean }>());
  const effectGroupSelectionRef = useRef(false);
  const [editingEffectGroup, setEditingEffectGroup] = useState(false);
  const setGroupSelection = useCallback((active: boolean) => {
    effectGroupSelectionRef.current = active;
    setEditingEffectGroup(active);
  }, []);
  const openedRef = useRef(false);
  const inputsRef = useRef(new Map<string, HTMLInputElement>());
  const focusedRef = useRef<string | null>(null);
  const nextKeyRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const displayedDropRef = useRef<DisplayedDropTarget | null>(null);
  const pointerDraggingRef = useRef(false);
  const pointerCleanupRef = useRef<(() => void) | null>(null);
  const stopPointerTracking = useCallback(() => {
    pointerCleanupRef.current?.();
    pointerCleanupRef.current = null;
    pointerDraggingRef.current = false;
  }, []);
  useEffect(() => {
    if (!open) stopPointerTracking();
    return stopPointerTracking;
  }, [open, stopPointerTracking]);
  const lyricCollision = useCallback<CollisionDetection>(args => {
    if (!args.pointerCoordinates || !listRef.current) return closestCenter(args);
    const targets = args.droppableContainers.flatMap(container => {
      const target: LyricDropTarget | undefined = container.data.current?.lyricDrop;
      const rect = args.droppableRects.get(container.id);
      return target && rect ? [{ id: container.id, rect, target }] : [];
    });
    const match = resolveDragTarget(args.pointerCoordinates, editorDropViewport(listRef.current), targets, listRef.current.getBoundingClientRect());
    return match ? [{ id: match.id }] : [];
  }, []);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: lyricKeyboardCoordinates, scrollBehavior: "auto" })
  );

  useEffect(() => {
    if (!open) { openedRef.current = false; return; }
    if (!currentLine || selectedLineIndex === null) return;
    const key = JSON.stringify([projectId, selectedLineIndex, currentLine]);
    if (sessionRef.current !== key || !openedRef.current) {
      sessionRef.current = key;
      const initial = cellsFromLine(currentLine);
      const draft = cacheRef.current.get(key) ?? { past: [], present: initial, future: [] };
      const remembered = selectionCacheRef.current.get(key);
      const selection = resolveEffectSelection(draft.present, { requestedIndices: editEffectIndices,
        rememberedKeys: remembered?.keys });
      setGroupSelection(!!editEffectIndices?.length || remembered?.followGroup === true);
      setSelected(selection); setHistory(draft);
      setContentTarget(null);
      setEffectDrawerOpen(!!editEffectIndices?.length);
      focusedRef.current = editEffectIndices?.length ? draft.present.find(cell => selection.has(cell.key))?.key ?? null
        : draft.present.find((cell) => cell.originalIndex === useKaraokeStore.getState().currentIndex)?.key ?? draft.present[0]?.key ?? null;
    }
    openedRef.current = true;
    const frame = requestAnimationFrame(() => {
      if (editEffectIndices?.length) {
        return;
      }
      const input = focusedRef.current && inputsRef.current.get(focusedRef.current);
      if (input) { input.focus(); input.select(); }
    });
    return () => cancelAnimationFrame(frame);
  }, [open, currentLine, selectedLineIndex, projectId, editEffectIndices, setGroupSelection]);

  const change = (update: (cells: LyricCellDraft[]) => LyricCellDraft[]) => setHistory((previous) => {
    const present = update(previous.present);
    return present === previous.present ? previous : {
      past: [...previous.past, previous.present].slice(-80), present, future: [],
    };
  });
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null);
    const from = history.present.findIndex((cell) => cell.key === active.id);
    const target = releaseDropTarget(active.id, displayedDropRef.current, over?.data.current?.lyricDrop);
    stopPointerTracking();
    displayedDropRef.current = null;
    if (from < 0 || !target) return;
    const to = dropDestination(from, history.present.length, target);
    change(cells => dropCellContent(cells, from, to, target.effect));
  };
  const insert = (kind: "text" | "image", afterKey: string | null, options: { sticker?: LyricSticker; text?: string; vocal?: string } = {}) => {
    const cell: LyricCellDraft = { key: `new-${nextKeyRef.current++}`, originalIndex: null, kind,
      text: kind === "image" ? IMAGE_TOKEN : options.text ?? "", vocal: options.vocal ?? "", sticker: options.sticker };
    change(cells => insertCellAfter(cells, cell, afterKey));
    focusedRef.current = cell.key;
    closeContentDrawer();
  };
  const closeContentDrawer = () => setContentTarget(target => target ? { ...target, open: false } : null);
  const chooseImage = (sticker: LyricSticker) => {
    if (!contentTarget?.open) return;
    if (contentTarget.kind === "replace") {
      change(cells => replaceCellImage(cells, contentTarget.key, sticker));
      closeContentDrawer();
    } else insert("image", contentTarget.afterKey, { sticker });
  };
  const undo = () => {
    const last = history.past.at(-1); if (!last) return;
    setSelected(selectionAfterDraftHistory(history.present, last, selected, { followGroup: effectGroupSelectionRef.current }));
    setHistory({ past: history.past.slice(0, -1), present: last, future: [history.present, ...history.future] });
  };
  const redo = () => {
    const next = history.future[0]; if (!next) return;
    setSelected(selectionAfterDraftHistory(history.present, next, selected, { followGroup: effectGroupSelectionRef.current }));
    setHistory({ past: [...history.past, history.present].slice(-80), present: next, future: history.future.slice(1) });
  };
  const serialize = (cells: LyricCellDraft[]) => cells.map(({ originalIndex, kind, text, vocal, sticker, effect }) => ({ originalIndex, kind, text, vocal, sticker, effect }));
  const applyEffect = (effect?: BlockEffect) => change(cells => applySelectedEffect(cells, selected, effect));
  const selectEffectRun = (run: EffectRun) => {
    setGroupSelection(true);
    setSelected(new Set(history.present.slice(run.start, run.end + 1).map(cell => cell.key)));
    setEffectDrawerOpen(true);
  };
  const invalid = history.present.some((cell) => cell.kind === "image" ? !cell.sticker : cell.text.length === 0);
  const closeEffectDrawer = () => {
    setEffectDrawerOpen(false);
    if (effectGroupSelectionRef.current) {
      setGroupSelection(false);
      setSelected(new Set());
    }
  };
  const dirty = currentLine && JSON.stringify(serialize(history.present)) !== JSON.stringify(serialize(cellsFromLine(currentLine)));
  const resumeTiming = timingSessionOpen && history.present.some((cell) => cell.kind !== "image" && cell.originalIndex === null);
  const close = () => {
    if (sessionRef.current) { cacheRef.current.set(sessionRef.current, history); selectionCacheRef.current.set(sessionRef.current, { keys: new Set(selected), followGroup: effectGroupSelectionRef.current }); }
    setContentTarget(null); setEffectDrawerOpen(false); actions.closeEditModal();
  };
  const save = async () => {
    if (selectedLineIndex === null || !currentLine || invalid || !dirty || stickerBusy) return;
    const state = useKaraokeStore.getState();
    const wasTiming = state.isTimingActive || state.editingLineIndex !== null;
    if (sessionRef.current) {
      cacheRef.current.delete(sessionRef.current);
      selectionCacheRef.current.delete(sessionRef.current);
    }
    sessionRef.current = null;
    await actions.replaceLineWords(selectedLineIndex, history.present);
    const savedLine = useKaraokeStore.getState().lyricsData[selectedLineIndex];
    const savedKey = JSON.stringify([projectId, selectedLineIndex, savedLine]);
    // Saving completes this edit. A later ordinary edit starts with no batch
    // selection; explicitly clicking an effect boundary still selects its run.
    selectionCacheRef.current.delete(savedKey);
    setGroupSelection(false);
    setSelected(new Set());
    const persistence = wasTiming ? actions.saveTimingDraft() : actions.saveCurrentProject();
    actions.closeEditModal();
    try {
      const handlers = usePlayerHandlersStore.getState();
      await Promise.all([persistence, wasTiming ? handlers.handleResumeTiming() : Promise.resolve()]);
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
    onKeyDown={event => {
      // Base UI traps composite arrows; the active drag sensor needs them instead.
      if ((event.code === "ArrowUp" || event.code === "ArrowDown") && event.target instanceof HTMLElement
        && event.target.closest('[data-editor-drag-handle][aria-pressed="true"]')) event.preventBaseUIHandler();
    }}
    footer={<div className="flex w-full flex-wrap items-center justify-between gap-2">
      <EffectSelectionToolbar cells={history.present} selected={selected} onEdit={() => setEffectDrawerOpen(true)}
        onSelectAll={() => { setGroupSelection(false); setSelected(selected.size > 0 ? new Set() : new Set(history.present.map(cell => cell.key))); }} />
      <ButtonCommon className="w-full sm:ml-auto sm:w-auto" icon={<Save />} color={resumeTiming ? "warning" : "primary"}
      disabled={!dirty || invalid || stickerBusy} onClick={() => void save()}>
      {resumeTiming ? text(locale, "บันทึกและปาดต่อ", "Save & continue timing") : text(locale, "บันทึก", "Save")}
    </ButtonCommon></div>}>
    <div className="space-y-3">
      {open && <LyricDraftPreview cells={history.present} projectId={projectId} />}
      <p className="text-[11px] text-muted-foreground">{text(locale,
        "แตะป้ายเอฟเฟกต์เพื่อแก้ทั้งกลุ่ม หรือเลือกคำ / รูป แล้วกดเอฟเฟกต์ด้านล่าง",
        "Tap an effect label to edit its group, or select blocks and use Effects below")}</p>
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
        <DndContext sensors={sensors} collisionDetection={lyricCollision}
          onDragStart={({ active, activatorEvent }) => {
            displayedDropRef.current = null;
            const row = [...listRef.current?.querySelectorAll<HTMLElement>("[data-editor-cell]") ?? []].find(node => node.dataset.editorCell === String(active.id));
            const content = row?.querySelector<HTMLElement>("[data-editor-drag-handle]")?.parentElement;
            setDragging({ key: String(active.id), width: content?.getBoundingClientRect().width ?? 280 });
            stopPointerTracking();
            if (activatorEvent.type === "keydown") return;
            pointerDraggingRef.current = true;
            const from = history.present.findIndex(cell => cell.key === active.id);
            const indices = new Map(history.present.map((cell, index) => [cell.key, index]));
            let lastPoint: { x: number; y: number } | undefined;
            const repaint = () => {
              const list = listRef.current;
              if (!list || !lastPoint) return;
              const targets = [...list.querySelectorAll<HTMLElement>("[data-editor-drop-id]")].flatMap(node => {
                const index = indices.get(node.dataset.editorCell ?? "") ?? -1;
                const target: LyricDropTarget = node.dataset.editorDropBefore !== undefined
                  ? { kind: "gap", beforeIndex: Number(node.dataset.editorDropBefore), effect: node.dataset.editorDropGroup === undefined ? undefined : history.present[Number(node.dataset.editorDropGroup)]?.effect }
                  : { kind: "row", index, effect: history.present[index]?.effect };
                return [{ id: node.dataset.editorDropId!, rect: node.getBoundingClientRect(), target }];
              });
              const match = resolveDragTarget(lastPoint, editorDropViewport(list), targets, list.getBoundingClientRect());
              if (match) paintDropIndicator(list, displayedDropRef, active.id, from, match.id, match.target);
            };
            const mouse = (event: MouseEvent) => { lastPoint = { x: event.clientX, y: event.clientY }; repaint(); };
            const touch = (event: TouchEvent) => { const point = event.changedTouches[0]; if (point) { lastPoint = { x: point.clientX, y: point.clientY }; repaint(); } };
            document.addEventListener("mousemove", mouse, true);
            document.addEventListener("mouseup", mouse, true);
            document.addEventListener("touchmove", touch, true);
            document.addEventListener("touchend", touch, true);
            document.addEventListener("scroll", repaint, true);
            pointerCleanupRef.current = () => {
              document.removeEventListener("mousemove", mouse, true);
              document.removeEventListener("mouseup", mouse, true);
              document.removeEventListener("touchmove", touch, true);
              document.removeEventListener("touchend", touch, true);
              document.removeEventListener("scroll", repaint, true);
            };
          }} onDragEnd={onDragEnd}
          onDragCancel={() => { displayedDropRef.current = null; stopPointerTracking(); setDragging(null); }}>
          <div ref={listRef} className="relative">
          <SortableContext items={history.present.map((cell) => cell.key)} strategy={verticalListSortingStrategy}>
            <EffectCellList cells={history.present} selected={selected} onEditRun={selectEffectRun} renderCell={(cell, index) => {
              return <SortableLyricCell key={cell.key} cell={cell} selected={selected.has(cell.key)}
                onSelect={() => { setGroupSelection(false); setSelected((previous) => { const next = new Set(previous); if (next.has(cell.key)) next.delete(cell.key); else next.add(cell.key); return next; }); }} ordinal={index} projectId={projectId}
                onFocus={() => { focusedRef.current = cell.key; }}
                onReplaceImage={() => setContentTarget({ kind: "replace", key: cell.key, open: true })}
                inputRef={(node) => { if (node) inputsRef.current.set(cell.key, node); else inputsRef.current.delete(cell.key); }}
                onRemove={() => { setSelected((previous) => { const next = new Set(previous); next.delete(cell.key); return next; }); change((cells) => cells.filter((item) => item.key !== cell.key)); }}
                onEdit={(field, value) => change((cells) => cells.map((item) => item.key === cell.key ? { ...item, [field]: value } : item))} />;
            }} />
          </SortableContext>
          <LyricDropIndicator listRef={listRef} displayedRef={displayedDropRef} pointerDraggingRef={pointerDraggingRef} />
          </div>
          {dragging && createPortal(<DragOverlay dropAnimation={null} zIndex={70}>
            {history.present.filter(cell => cell.key === dragging.key).map(cell =>
              <LyricDragPreview key={cell.key} cell={cell} width={dragging.width} projectId={projectId} />)}
          </DragOverlay>, document.body)}
        </DndContext>
        <div className="mt-2 flex justify-end border-t border-line pt-2">
          <ButtonCommon size="xs" color="secondary" variant="outline" icon={<Plus />}
            onClick={() => setContentTarget({ kind: "add", afterKey: focusedRef.current, open: true })}>{text(locale, "เพิ่มคำ", "Add word")}</ButtonCommon>
        </div>
      </div>
    </div>
    <LyricContentDrawer open={!!open && !!contentTarget?.open} replacing={contentTarget?.kind === "replace"}
      projectId={projectId} onClose={closeContentDrawer} onBusyChange={setStickerBusy}
      onWord={(word, vocal) => { if (contentTarget?.open && contentTarget.kind === "add") insert("text", contentTarget.afterKey, { text: word, vocal }); }}
      onImage={chooseImage} />
    <BlockEffectPanel open={!!open && effectDrawerOpen} onClose={closeEffectDrawer} projectId={projectId}
      onReselect={editingEffectGroup ? closeEffectDrawer : undefined}
      cells={history.present} selected={selected} onApply={applyEffect} />
  </ModalCommon>;
}
