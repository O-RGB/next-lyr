"use client";
import { useEffect, useRef } from "react";
import { EFFECT_TYPES, EFFECT_LABELS, effectLabel, effectShortLabel, type WeatherStyle, groupEffectBlocks, type EffectType, type EffectRun } from "@/lib/block-effects/types";
import { WeatherControls } from "./weather-controls";
import { layoutEffectEditorBlocks } from "@/lib/block-effects/editor-layout";
import { effectAppearance } from "@/lib/block-effects/appearance";
import { makeEffectGroupLayer, updateEffectGroupLayer, clearEffectGroupLayer } from "@/components/lyrics/effect-group-layer";
import type { LyricCellDraft } from "@/lib/karaoke/inline-content";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";

export function BlockEffectPanel({ cells, selected, onSelectAll, onApply, onConnect, onWeatherChange, onSelectRun, onRangeChange }: {
  cells: LyricCellDraft[]; selected: Set<string>; onSelectAll: () => void;
  onApply: (type: EffectType | "none") => void; onConnect: (connected: boolean) => void; onWeatherChange: (style: WeatherStyle) => void;
  onSelectRun: (run: EffectRun) => void; onRangeChange: (run: EffectRun, start: number, end: number) => void;
}) {
  const locale = useSettingsStore((state) => state.uiLocale);
  const targets = cells.filter((cell) => selected.has(cell.key));
  const types = new Set(targets.map((cell) => cell.effect?.type ?? "none"));
  const value = types.size === 1 ? [...types][0] : types.size > 1 ? "mixed" : "unselected";
  const connected = targets.every((cell) => cell.effect?.connected !== false);
  const runs = groupEffectBlocks(cells);
  const active = runs.find(run => targets.length === run.end - run.start + 1 && cells.slice(run.start, run.end + 1).every(cell => selected.has(cell.key)));
  const layout = layoutEffectEditorBlocks(cells, cells.map(cell => cell.kind === "image" ? 48 : Math.min(120, Math.max(48, cell.text.length * 10 + 20))), { gap: 6, lift: 4 });
  const layer = useRef(makeEffectGroupLayer());
  useEffect(() => { const value = layer.current; return () => clearEffectGroupLayer(value); }, []);
  useEffect(() => { updateEffectGroupLayer(layer.current, layout.groups.map((group, index) => ({
    key: `draft:${cells[group.run.start].key}:${group.run.effect.type}`, effect: group.run.effect,
    indices: [index], lineIndex: 0, start: group.startCap.left, end: group.endCap.left, capWidth: group.startCap.width,
    top: 24 - group.startCap.lift, boxHeight: 26, rowTop: 0, rowHeight: 76, rangeY: 62, clipLeft: 0, clipRight: layout.width,
    label: text(locale, ...effectShortLabel(group.run.effect)),
    title: `${text(locale, ...effectLabel(group.run.effect))} · ${group.run.start + 1}–${group.run.end + 1}`,
    background: "var(--color-base)",
  })), 76, placement => { const run = runs[placement.indices[0]]; if (run) onSelectRun(run); }); });
  return <section className="rounded-xl border border-line bg-panel p-3" aria-label={text(locale, "เอฟเฟกต์แต่ละบล็อก", "Block effects")}>
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-semibold">{text(locale, "เอฟเฟกต์", "Effects")} · {targets.length} {text(locale, "บล็อกที่เลือก", "selected")}</span>
      <button type="button" onClick={onSelectAll} className="ml-auto rounded-md border border-line px-2 py-1.5">
        {text(locale, selected.size === cells.length && cells.length > 0 ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด", selected.size === cells.length && cells.length > 0 ? "Clear selection" : "Select all")}
      </button>
    </div>
    {runs.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5" aria-label={text(locale, "กลุ่มเอฟเฟกต์ในบรรทัด", "Effect groups in this line")}>
      {runs.map(run => <button type="button" key={`${cells[run.start].key}:${run.effect.type}`} data-effect-group={run.effect.type}
        data-effect-start={run.start} data-effect-end={run.end} onClick={() => onSelectRun(run)}
        aria-pressed={active === run} className="min-h-9 rounded-md border px-2 text-xs"
        style={{ borderColor: active === run ? effectAppearance(run.effect.type).glow : undefined,
          background: active === run ? `${effectAppearance(run.effect.type).glow}12` : undefined }}>
        {text(locale, ...effectLabel(run.effect))} · {run.start + 1}–{run.end + 1}
      </button>)}
    </div>}
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <select data-effect-type-control aria-label={text(locale, "เลือกเอฟเฟกต์", "Choose effect")} disabled={!targets.length} value={value}
        onChange={(event) => onApply(event.target.value as EffectType | "none")}
        className="h-9 min-w-28 rounded-md border border-line bg-base px-2">
        {value === "unselected" && <option value="unselected" disabled>{text(locale, "เลือกกลุ่มหรือบล็อก", "Select a group or blocks")}</option>}
        {value === "mixed" && <option value="mixed" disabled>{text(locale, "หลายเอฟเฟกต์", "Mixed effects")}</option>}
        <option value="none">{text(locale, "ไม่มีเอฟเฟกต์", "No effect")}</option>
        {EFFECT_TYPES.map((type) => <option key={type} value={type}>{text(locale, ...EFFECT_LABELS[type])}</option>)}
      </select>
      <WeatherControls targets={targets} onChange={onWeatherChange} />
      <label className="flex min-h-9 items-center gap-2">
        <input type="checkbox" checked={connected} disabled={!targets.some((cell) => cell.effect)}
          onChange={(event) => onConnect(event.target.checked)} />
        {text(locale, "เชื่อมบล็อกข้างกัน", "Connect adjacent blocks")}
      </label>
    </div>
    {active && <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" aria-label={text(locale, "ช่วงของกลุ่มเอฟเฟกต์", "Effect group range")}>
      <span>{text(locale, "ช่วงบล็อก", "Block range")}</span>
      <select className="h-9 min-w-24 rounded-md border border-line bg-base px-2" value={active.start}
        aria-label={text(locale, "เริ่มเอฟเฟกต์ที่บล็อก", "Effect start block")}
        onChange={event => { const start = Number(event.target.value); onRangeChange(active, start, Math.max(start, active.end)); }}>
        {cells.map((cell, index) => <option key={cell.key} value={index}>{index + 1} · {cell.kind === "image" ? text(locale, "รูป", "Image") : cell.text.slice(0, 12)}</option>)}
      </select>
      <span>{text(locale, "ถึง", "to")}</span>
      <select className="h-9 min-w-24 rounded-md border border-line bg-base px-2" value={active.end}
        aria-label={text(locale, "สิ้นสุดเอฟเฟกต์ที่บล็อก", "Effect end block")}
        onChange={event => onRangeChange(active, active.start, Number(event.target.value))}>
        {cells.map((cell, index) => index < active.start ? null : <option key={cell.key} value={index}>{index + 1} · {cell.kind === "image" ? text(locale, "รูป", "Image") : cell.text.slice(0, 12)}</option>)}
      </select>
    </div>}
    <p className="mt-2 text-[11px] text-muted-foreground">{text(locale,
      "ติ๊กช่องข้างคำหรือรูปเพื่อเลือก เอฟเฟกต์เดียวกันจะเชื่อมเฉพาะบล็อกที่ติดกัน เวลาไม่เปลี่ยน",
      "Select words or images using the checkboxes. Matching effects connect only adjacent blocks. Timestamps stay unchanged")}</p>
    {runs.length > 0 && <div className="mt-2 overflow-x-auto rounded-md border border-line bg-base" aria-label={text(locale, "พรีวิวเอฟเฟกต์ในบรรทัด", "Line effect preview")}>
      <div className="relative h-[76px]" style={{ width: layout.width }}>
        <div ref={(element) => { layer.current.element = element; }} className="pointer-events-none absolute inset-0" />
        {cells.map((cell, index) => <span key={cell.key} className="relative z-20 inline-block truncate px-1 text-center text-xs font-bold"
          style={{ position: "absolute", top: 24 - layout.words[index].lift, left: layout.words[index].left, width: layout.words[index].width,
            height: 26, border: "1px solid var(--color-line)", borderRadius: 5, lineHeight: "24px",
            textShadow: cell.effect ? `0 1px 6px ${effectAppearance(cell.effect.type).glow}25` : undefined }}>
          {cell.kind === "image" ? text(locale, "รูป", "Image") : cell.text}
        </span>)}
      </div>
    </div>}
  </section>;
}

/** Keep effect actions reachable while selecting rows lower down on a phone. */
export function QuickBlockEffectControls({ cells, selected, onApply, onConnect, onWeatherChange }: {
  cells: LyricCellDraft[]; selected: Set<string>; onApply: (type: EffectType | "none") => void; onConnect: (connected: boolean) => void; onWeatherChange: (style: WeatherStyle) => void;
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
    <WeatherControls targets={targets} onChange={onWeatherChange} />
    <label className="flex min-h-9 items-center gap-1.5">
      <input type="checkbox" checked={targets.every((cell) => cell.effect?.connected !== false)} disabled={!targets.some((cell) => cell.effect)}
        onChange={(event) => onConnect(event.target.checked)} />
      {text(locale, "เชื่อมบล็อก", "Connect blocks")}
    </label>
  </div>;
}
