"use client";

import { useDndContext, useDroppable } from "@dnd-kit/core";
import type { ButtonHTMLAttributes } from "react";
import type { LyricDropTarget } from "./drop-targets";

/** Uses the existing group margin; this adds no space when the list is idle. */
export function OutsideEffectDropTarget({ id, beforeIndex, end }: {
  id: string; beforeIndex: number; end?: boolean;
}) {
  const target: LyricDropTarget = { kind: "gap", beforeIndex };
  const { setNodeRef } = useDroppable({ id, data: { lyricDrop: target } });
  const { active } = useDndContext();
  const area = active ? `h-6 ${end ? "-bottom-3" : "-top-3"}` : `h-2 ${end ? "-bottom-2" : "-top-2"}`;
  return <div ref={setNodeRef} aria-hidden="true" data-editor-drop-id={id} data-editor-drop-before={beforeIndex}
    className={`pointer-events-none absolute inset-x-0 ${area}`} />;
}

/** The visible effect boundary itself accepts a drop at either end of its run. */
export function EffectBoundaryDropTarget({ id, target, groupStart, ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { id: string; target: LyricDropTarget & { kind: "gap" }; groupStart: number }) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { lyricDrop: target } });
  return <button {...props} ref={setNodeRef} data-editor-drop-id={id} data-editor-drop-before={target.beforeIndex}
    data-editor-drop-group={groupStart} data-drop-over={isOver || undefined} />;
}
