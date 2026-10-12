"use client";

import { Check, Sparkles, X } from "lucide-react";
import { useState } from "react";
import ButtonCommon from "@/components/common/button";
import { EffectIcon } from "@/components/lyrics/effect-icon";
import { EFFECT_CHOICES, EFFECT_LABELS, type BlockEffect } from "@next-karaoke/lyrics/effects";
import { getEffectSelection } from "@next-karaoke/lyrics/effects";
import { effectAppearance } from "@next-karaoke/lyrics/effects";
import type { LyricCellDraft } from "@/lib/karaoke/inline-content";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import { EditorDrawer } from "./editor-drawer";
import { LyricDraftPreview } from "./lyric-draft-preview";

interface SelectionProps { cells: LyricCellDraft[]; selected: Set<string> }

function EffectChoiceGrid({ selectedChoice, enabled, onApply }: {
  selectedChoice?: string; enabled: boolean; onApply: (effect?: BlockEffect) => void;
}) {
  const locale = useSettingsStore(state => state.uiLocale);
  const [query, setQuery] = useState("");
  const tokens = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const choices = EFFECT_CHOICES.filter(choice => {
    const family = choice.effect ? EFFECT_LABELS[choice.effect.type].join(" ") + " " + choice.effect.type : "";
    const label = (choice.label.join(" ") + " " + family).toLocaleLowerCase();
    return tokens.every(token => label.includes(token));
  });
  return <div className="space-y-3">
    <input type="search" value={query} onChange={event => setQuery(event.target.value)}
      aria-label={text(locale, "ค้นหาเอฟเฟกต์", "Search effects")}
      placeholder={text(locale, "ค้นหา เช่น กลางคืน ดาว หิมะ", "Search night, stars, snow…")}
      className="h-10 w-full rounded-lg border border-line bg-base px-3 text-xs" />
    <div className="grid grid-cols-2 gap-2" role="group" aria-label={text(locale, "เลือกเอฟเฟกต์", "Choose effect")}>
      {choices.map(choice => <button key={choice.key} type="button" aria-pressed={selectedChoice === choice.key}
        disabled={!enabled} onClick={() => onApply(choice.effect)} data-effect-option={choice.key}
        aria-label={text(locale, ...choice.label)} title={text(locale, ...choice.label)}
        className="flex h-14 min-w-0 items-center gap-2 rounded-lg border border-line bg-base px-3 text-left text-xs aria-pressed:border-primary aria-pressed:bg-primary/10"
        style={{ borderColor: selectedChoice === choice.key && choice.effect ? effectAppearance(choice.effect.type).glow : undefined }}>
        {choice.effect ? <EffectIcon effect={choice.effect} /> : <X className="size-5 shrink-0 text-muted-foreground" />}
        <span className="line-clamp-2 min-w-0 flex-1 leading-4">{text(locale, ...choice.label)}</span>
        <Check aria-hidden="true" className={`size-3 shrink-0 ${selectedChoice === choice.key ? "" : "invisible"}`} />
      </button>)}
    </div>
    {!choices.length && <p role="status" className="text-xs text-muted-foreground">{text(locale, "ไม่พบเอฟเฟกต์", "No matching effects")}</p>}
  </div>;
}

/** One reachable action replaces duplicate desktop/mobile effect selectors. */
export function EffectSelectionToolbar({ cells, selected, onSelectAll, onEdit }: SelectionProps & {
  onSelectAll: () => void; onEdit: () => void;
}) {
  const locale = useSettingsStore(state => state.uiLocale);
  const { targets } = getEffectSelection(cells, selected);
  return <div className="flex min-w-0 flex-wrap items-center gap-2">
    <ButtonCommon type="button" size="sm" variant="outline" icon={<Sparkles />} data-edit-effects
      disabled={!targets.length} onClick={onEdit}>
      {text(locale, "เอฟเฟกต์", "Effects")} · {targets.length} {text(locale, "คำ / รูป", "blocks")}
    </ButtonCommon>
    <button type="button" onClick={onSelectAll} className="min-h-9 rounded-md px-2 text-xs text-muted-foreground hover:bg-panel-2">
      {text(locale, targets.length > 0 ? "ยกเลิกเลือก" : "เลือกทั้งหมด",
        targets.length > 0 ? "Clear selection" : "Select all")}
    </button>
  </div>;
}

export function BlockEffectPanel({ open, onClose, projectId, cells, selected, onApply, onReselect }: SelectionProps & {
  open: boolean; onClose: () => void; projectId: string | null;
  onApply: (effect?: BlockEffect) => void;
  onReselect?: () => void;
}) {
  const locale = useSettingsStore(state => state.uiLocale);
  const { targets } = getEffectSelection(cells, selected);
  const ranges: number[][] = [];
  cells.forEach((cell, index) => {
    if (!selected.has(cell.key)) return;
    const last = ranges.at(-1);
    if (last && last[1] === index) last[1] = index + 1;
    else ranges.push([index + 1, index + 1]);
  });
  const rangeLabel = ranges.map(([start, end]) => start === end ? `${start}` : `${start}–${end}`).join(", ");
  const selectedChoice = targets.length ? EFFECT_CHOICES.find(choice => targets.every(cell =>
    cell.effect?.type === choice.effect?.type && cell.effect?.variant === choice.effect?.variant))?.key : undefined;
  return <EditorDrawer open={open} onClose={onClose} placement="bottom" title={onReselect
    ? text(locale, "แก้ไขเอฟเฟกต์ทั้งกลุ่ม", "Edit group effect") : text(locale, "เอฟเฟกต์เฉพาะที่เลือก", "Effects for selected blocks")}
    initialFocus={() => document.querySelector<HTMLButtonElement>('[data-effect-option][aria-pressed="true"]')}
    description={text(locale, `ใช้กับ ${targets.length} คำ / รูป · บล็อก ${rangeLabel}`, `Apply to ${targets.length} blocks · ${rangeLabel}`)}
    footer={<div className="flex items-center justify-end gap-2">
      {onReselect && <ButtonCommon type="button" variant="outline" onClick={onReselect}>{text(locale, "เลือกบางส่วน", "Select part of group")}</ButtonCommon>}
      <ButtonCommon type="button" icon={<Check />} onClick={onClose}>{text(locale, "เสร็จแล้ว", "Done")}</ButtonCommon>
    </div>}>
    {open && <div className="space-y-4">
      <LyricDraftPreview cells={cells} projectId={projectId} />
      <EffectChoiceGrid selectedChoice={selectedChoice} enabled={targets.length > 0} onApply={onApply} />
    </div>}
  </EditorDrawer>;
}
