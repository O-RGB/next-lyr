"use client";

import { useDndContext } from "@dnd-kit/core";
import { useLayoutEffect, useRef, type RefObject } from "react";
import type { DisplayedDropTarget, DropRect, LyricDropTarget } from "./drop-targets";

export function editorDropViewport(list: HTMLElement): DropRect {
  for (let parent = list.parentElement; parent; parent = parent.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(parent).overflowY)) return parent.getBoundingClientRect();
  }
  return list.getBoundingClientRect();
}

export function paintDropIndicator(list: HTMLDivElement, displayedRef: RefObject<DisplayedDropTarget | null>, activeId: string | number,
  from: number, targetId: string | number, target: LyricDropTarget) {
  const marker = list.querySelector<HTMLDivElement>("[data-editor-drop-indicator]");
  const node = [...list.querySelectorAll<HTMLElement>("[data-editor-drop-id]")]
    .find(item => item.dataset.editorDropId === String(targetId));
  if (!marker || !node) return;
  const box = node.getBoundingClientRect(), bounds = list.getBoundingClientRect(), viewport = editorDropViewport(list);
  const y = target.kind === "gap"
    ? target.effect ? node.dataset.effectBoundary === "start" ? box.bottom : box.top : (box.top + box.bottom) / 2
    : from < target.index ? box.bottom : box.top;
  marker.style.top = `${Math.max(viewport.top + 1, Math.min(viewport.bottom - 1, y)) - bounds.top}px`;
  marker.hidden = false;
  displayedRef.current = { activeId, target };
  delete marker.dataset.dropBefore;
  delete marker.dataset.dropIndex;
  if (target.kind === "gap") marker.dataset.dropBefore = String(target.beforeIndex);
  else marker.dataset.dropIndex = String(target.index);
  marker.dataset.dropEffect = target.effect?.type ?? "none";
}

/** This single marker is also the committed destination when the pointer exits. */
export function LyricDropIndicator({ listRef, displayedRef, pointerDraggingRef }: {
  listRef: RefObject<HTMLDivElement | null>; displayedRef: RefObject<DisplayedDropTarget | null>;
  pointerDraggingRef: RefObject<boolean>;
}) {
  const { active, over } = useDndContext();
  const markerRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const marker = markerRef.current, list = listRef.current;
    if (!marker || !list) return;
    if (!active) { marker.hidden = true; displayedRef.current = null; return; }
    if (pointerDraggingRef.current) return;
    const target: LyricDropTarget | undefined = over?.data.current?.lyricDrop;
    if (!over || !target) return;
    const from = active.data.current?.sortable?.index ?? 0;
    paintDropIndicator(list, displayedRef, active.id, from, over.id, target);
  });
  return <div ref={markerRef} hidden aria-hidden="true" data-editor-drop-indicator
    className="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-primary" />;
}
