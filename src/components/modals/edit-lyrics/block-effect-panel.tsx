"use client";
import { useEffect, useRef } from "react";
import { EFFECT_TYPES, EFFECT_LABELS, groupEffectBlocks, type EffectType } from "@/lib/block-effects/types";
import { effectGeometry } from "@/lib/block-effects/catalog";
import { effectAppearance } from "@/lib/block-effects/appearance";
import { makeBlockEffectLayer, updateBlockEffectLayer, clearBlockEffectLayer } from "@/components/lyrics/block-effect-layer";
import type { LyricCellDraft } from "@/lib/karaoke/inline-content";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";

export function BlockEffectPanel({ cells, selected, onSelectAll, onApply, onConnect }: {
  cells: LyricCellDraft[]; selected: Set<string>; onSelectAll: () => void;
  onApply: (type: EffectType | "none") => void; onConnect: (connected: boolean) => void;
}) {
  const locale = useSettingsStore((state) => state.uiLocale);
  const targets = cells.filter((cell) => selected.has(cell.key));
  const types = new Set(targets.map((cell) => cell.effect?.type ?? "none"));
  const value = types.size === 1 ? [...types][0] : types.size > 1 ? "mixed" : "none";
  const connected = targets.every((cell) => cell.effect?.connected !== false);
  const runs = groupEffectBlocks(cells);
  const starts = new Set(runs.map((run) => run.start)), ends = new Set(runs.map((run) => run.end));
  const spans: { left: number; width: number }[] = []; let total = 0;
  for (const [index, cell] of cells.entries()) {
    const width = cell.kind === "image" ? 48 : Math.min(120, Math.max(48, cell.text.length * 10 + 20));
    const reserve = effectGeometry(1, 18).outset;
    const leftReserve = starts.has(index) ? reserve : 0, rightReserve = ends.has(index) ? reserve : 0;
    spans.push({ left: total + leftReserve, width }); total += width + leftReserve + rightReserve + 6;
  }
  const layer = useRef(makeBlockEffectLayer());
  useEffect(() => { const value = layer.current; return () => clearBlockEffectLayer(value); }, []);
  useEffect(() => { updateBlockEffectLayer(layer.current, runs.map((run) => {
    const first = spans[run.start], last = spans[run.end], geometry = effectGeometry(last.left + last.width - first.left, 18);
    return { key: `draft:${cells[run.start].key}:${run.effect.type}`, effect: run.effect, left: first.left - geometry.outset,
      top: 35 - geometry.rise, width: geometry.width, height: geometry.height, progress: .5 };
  })); });
  return <section className="rounded-xl border border-line bg-panel p-3" aria-label={text(locale, "เอฟเฟกต์แต่ละบล็อก", "Block effects")}>
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-semibold">{text(locale, "เอฟเฟกต์", "Effects")} · {targets.length} {text(locale, "บล็อกที่เลือก", "selected")}</span>
      <button type="button" onClick={onSelectAll} className="ml-auto rounded-md border border-line px-2 py-1.5">
        {text(locale, selected.size === cells.length && cells.length > 0 ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด", selected.size === cells.length && cells.length > 0 ? "Clear selection" : "Select all")}
      </button>
    </div>
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <select aria-label={text(locale, "เลือกเอฟเฟกต์", "Choose effect")} disabled={!targets.length} value={value}
        onChange={(event) => onApply(event.target.value as EffectType | "none")}
        className="h-9 min-w-28 rounded-md border border-line bg-base px-2">
        {value === "mixed" && <option value="mixed" disabled>{text(locale, "หลายเอฟเฟกต์", "Mixed effects")}</option>}
        <option value="none">{text(locale, "ไม่มีเอฟเฟกต์", "No effect")}</option>
        {EFFECT_TYPES.map((type) => <option key={type} value={type}>{text(locale, ...EFFECT_LABELS[type])}</option>)}
      </select>
      <label className="flex min-h-9 items-center gap-2">
        <input type="checkbox" checked={connected} disabled={!targets.some((cell) => cell.effect)}
          onChange={(event) => onConnect(event.target.checked)} />
        {text(locale, "เชื่อมบล็อกข้างกัน", "Connect adjacent blocks")}
      </label>
    </div>
    <p className="mt-2 text-[11px] text-muted-foreground">{text(locale,
      "ติ๊กช่องข้างคำหรือรูปเพื่อเลือก เอฟเฟกต์เดียวกันจะเชื่อมเฉพาะบล็อกที่ติดกัน เวลาไม่เปลี่ยน",
      "Select words or images using the checkboxes. Matching effects connect only adjacent blocks. Timestamps stay unchanged")}</p>
    {runs.length > 0 && <div className="mt-2 overflow-x-auto rounded-md border border-line bg-base" aria-label={text(locale, "พรีวิวเอฟเฟกต์ในบรรทัด", "Line effect preview")}>
      <div className="relative h-14" style={{ width: total }}>
        <div ref={(element) => { layer.current.element = element; }} className="pointer-events-none absolute inset-0" />
        {cells.map((cell, index) => <span key={cell.key} className="relative z-20 inline-block truncate px-1 text-center text-xs font-bold"
          style={{ position: "absolute", top: 20, left: spans[index].left, width: spans[index].width, color: cell.effect ? effectAppearance(cell.effect.type).editor : undefined, textShadow: cell.effect ? `0 1px 6px ${effectAppearance(cell.effect.type).glow}25` : undefined }}>
          {cell.kind === "image" ? text(locale, "รูป", "Image") : cell.text}
        </span>)}
      </div>
    </div>}
  </section>;
}

/** Keep effect actions reachable while selecting rows lower down on a phone. */
export function QuickBlockEffectControls({ cells, selected, onApply, onConnect }: {
  cells: LyricCellDraft[]; selected: Set<string>; onApply: (type: EffectType | "none") => void; onConnect: (connected: boolean) => void;
}) {
  const locale = useSettingsStore((state) => state.uiLocale);
  const targets = cells.filter((cell) => selected.has(cell.key));
  if (!targets.length) return null;
  const types = new Set(targets.map((cell) => cell.effect?.type ?? "none"));
  const value = types.size === 1 ? [...types][0] : "mixed";
  return <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-line pb-2 text-[11px] sm:hidden">
    <span>{targets.length} {text(locale, "บล็อก", "blocks")}</span>
    <select aria-label={text(locale, "เอฟเฟกต์ของบล็อกที่เลือก", "Effect for selected blocks")} value={value}
      onChange={(event) => onApply(event.target.value as EffectType | "none")} className="h-9 rounded-md border border-line bg-base px-2">
      {value === "mixed" && <option value="mixed" disabled>{text(locale, "หลายเอฟเฟกต์", "Mixed effects")}</option>}
      <option value="none">{text(locale, "ไม่มีเอฟเฟกต์", "No effect")}</option>
      {EFFECT_TYPES.map((type) => <option key={type} value={type}>{text(locale, ...EFFECT_LABELS[type])}</option>)}
    </select>
    <label className="flex min-h-9 items-center gap-1.5">
      <input type="checkbox" checked={targets.every((cell) => cell.effect?.connected !== false)} disabled={!targets.some((cell) => cell.effect)}
        onChange={(event) => onConnect(event.target.checked)} />
      {text(locale, "เชื่อมบล็อก", "Connect blocks")}
    </label>
  </div>;
}
