"use client";

import { Check, Sparkles, X } from "lucide-react";
import ButtonCommon from "@/components/common/button";
import { EffectIcon } from "@/components/lyrics/effect-icon";
import { EFFECT_CHOICES, type BlockEffect } from "@/lib/block-effects/types";
import { getEffectSelection } from "@/lib/block-effects/editor";
import { effectAppearance } from "@/lib/block-effects/appearance";
import type { LyricCellDraft } from "@/lib/karaoke/inline-content";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import { EditorDrawer } from "./editor-drawer";
import { LyricDraftPreview } from "./lyric-draft-preview";

interface SelectionProps { cells: LyricCellDraft[]; selected: Set<string> }

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
      {text(locale, selected.size === cells.length && cells.length > 0 ? "ยกเลิกเลือก" : "เลือกทั้งหมด",
        selected.size === cells.length && cells.length > 0 ? "Clear selection" : "Select all")}
    </button>
  </div>;
}

export function BlockEffectPanel({ open, onClose, projectId, cells, selected, onApply }: SelectionProps & {
  open: boolean; onClose: () => void; projectId: string | null;
  onApply: (effect?: BlockEffect) => void;
}) {
  const locale = useSettingsStore(state => state.uiLocale);
  const { targets } = getEffectSelection(cells, selected);
  const selectedChoice = targets.length ? EFFECT_CHOICES.find(choice => targets.every(cell =>
    cell.effect?.type === choice.effect?.type && cell.effect?.variant === choice.effect?.variant))?.key : undefined;
  return <EditorDrawer open={open} onClose={onClose} placement="bottom" title={text(locale, "แก้ไขเอฟเฟกต์", "Edit effects")}
    initialFocus={() => document.querySelector<HTMLButtonElement>('[data-effect-option][aria-pressed="true"]')}
    description={text(locale, `ใช้กับ ${targets.length} คำ / รูปที่เลือก`, `Apply to ${targets.length} selected blocks`)}
    footer={<ButtonCommon type="button" icon={<Check />} onClick={onClose}>{text(locale, "เสร็จแล้ว", "Done")}</ButtonCommon>}>
    {open && <div className="space-y-4">
      <LyricDraftPreview cells={cells} projectId={projectId} />
      <div className="grid grid-cols-2 gap-2" role="group" aria-label={text(locale, "เลือกเอฟเฟกต์", "Choose effect")}>
        {EFFECT_CHOICES.map(choice => <button key={choice.key} type="button" aria-pressed={selectedChoice === choice.key}
          disabled={!targets.length} onClick={() => onApply(choice.effect)} data-effect-option={choice.key}
          aria-label={text(locale, ...choice.label)} title={text(locale, ...choice.label)}
          className="flex h-14 min-w-0 items-center gap-2 rounded-lg border border-line bg-base px-3 text-left text-xs aria-pressed:border-primary aria-pressed:bg-primary/10"
          style={{ borderColor: selectedChoice === choice.key && choice.effect ? effectAppearance(choice.effect.type).glow : undefined }}>
          {choice.effect ? <EffectIcon effect={choice.effect} /> : <X className="size-5 shrink-0 text-muted-foreground" />}
          <span className="line-clamp-2 min-w-0 flex-1 leading-4">{text(locale, ...choice.label)}</span>
          <Check aria-hidden="true" className={`size-3 shrink-0 ${selectedChoice === choice.key ? "" : "invisible"}`} />
        </button>)}
      </div>
    </div>}
  </EditorDrawer>;
}
