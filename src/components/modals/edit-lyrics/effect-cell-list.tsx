"use client";

import { Fragment, type ReactNode } from "react";
import { EffectIcon } from "@/components/lyrics/effect-icon";
import { groupEffectBlocks, effectLabel, type EffectRun } from "@next-karaoke/lyrics/effects";
import { effectAppearance } from "@next-karaoke/lyrics/effects";
import type { LyricCellDraft } from "@/lib/karaoke/inline-content";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import { EffectBoundaryDropTarget, OutsideEffectDropTarget } from "./effect-drop-target";

/** Rotate the main screen's start → words → end structure into the vertical list. */
export function EffectCellList({ cells, selected, onEditRun, renderCell }: {
  cells: LyricCellDraft[]; selected: Set<string>; onEditRun: (run: EffectRun) => void;
  renderCell: (cell: LyricCellDraft, index: number) => ReactNode;
}) {
  const locale = useSettingsStore(state => state.uiLocale);
  const starts = new Map(groupEffectBlocks(cells).map(run => [run.start, run]));
  const content: ReactNode[] = [];
  for (let index = 0; index < cells.length; index++) {
    const run = starts.get(index), cell = cells[index];
    if (!run) { content.push(<Fragment key={cell.key}>{renderCell(cell, index)}</Fragment>); continue; }
    const color = effectAppearance(run.effect.type).glow;
    const active = cells.slice(run.start, run.end + 1).every(item => selected.has(item.key));
    const label = text(locale, ...effectLabel(run.effect));
    const cap = (end: boolean) => <EffectBoundaryDropTarget id={`effect:${cell.key}:${end ? "end" : "start"}`}
      target={{ kind: "gap", beforeIndex: end ? run.end + 1 : run.start, effect: run.effect }} groupStart={run.start}
      type="button" onClick={() => onEditRun(run)}
      data-effect-boundary={end ? "end" : "start"} data-effect-type={run.effect.type} data-effect-variant={run.effect.variant ?? "plain"}
      aria-label={text(locale, `แก้ไข${label} ช่วง ${run.start + 1}–${run.end + 1}`, `Edit ${label}, blocks ${run.start + 1}–${run.end + 1}`)}
      className="relative flex min-h-9 max-w-full items-center justify-center rounded-md border bg-base px-2 text-xs focus-visible:outline-2 focus-visible:outline-primary data-[drop-over]:ring-2 data-[drop-over]:ring-primary"
      style={{ borderColor: `${color}90`, boxShadow: active ? `0 0 0 1px ${color}30` : undefined }}>
      <EffectIcon effect={run.effect} size={24} />
    </EffectBoundaryDropTarget>;
    content.push(<div key={cell.key} data-editor-effect-group={run.effect.type} data-effect-start={run.start} data-effect-end={run.end}
      className="relative my-2 pl-3">
      <OutsideEffectDropTarget id={`outside:${cell.key}:start`} beforeIndex={run.start} />
      <div aria-hidden="true" data-vertical-effect-range className="pointer-events-none absolute bottom-4 left-1 top-4 w-2 rounded-l border-y-2 border-l-2"
        style={{ borderColor: `${color}80` }} />
      {cap(false)}
      <div className="my-1 rounded-md px-1" style={{ background: `${color}08` }}>
        {cells.slice(run.start, run.end + 1).map((item, offset) => <Fragment key={item.key}>{renderCell(item, run.start + offset)}</Fragment>)}
      </div>
      {cap(true)}
      <OutsideEffectDropTarget id={`outside:${cell.key}:end`} beforeIndex={run.end + 1} end />
    </div>);
    index = run.end;
  }
  return content;
}
