import { normalizeBlockEffect, type BlockEffect } from "@next-karaoke/lyrics/effects";
import type { LyricWordData } from "@/types/common.type";
import type { LineStickers, LyricSticker } from "@next-karaoke/lyrics/media";

// Content marker only. Images decorate a line and never consume a timing unit.
export const IMAGE_TOKEN = "\uFFFC";
export interface LyricCellDraft {
  key: string;
  originalIndex: number | null;
  kind: "text" | "image";
  text: string;
  vocal: string;
  sticker?: LyricSticker;
  effect?: BlockEffect;
}

/** Reorder content only. Text timing slots stay in order; images own no slot. */
export function moveCellContent(cells: LyricCellDraft[], from: number, to: number): LyricCellDraft[] {
  if (from < 0 || to < 0 || from >= cells.length || to >= cells.length || from === to) return cells;
  const content = [...cells];
  content.splice(to, 0, content.splice(from, 1)[0]);
  const textSlots = cells.filter(cell => cell.kind !== "image").map(cell => cell.originalIndex);
  let slot = 0;
  return content.map(cell => cell.kind === "image" ? cell : { ...cell, originalIndex: textSlots[slot++] });
}

/** A drop adopts its destination's membership, including leaving a group. */
export function dropCellContent(cells: LyricCellDraft[], from: number, to: number, groupEffect?: BlockEffect): LyricCellDraft[] {
  if (from < 0 || to < 0 || from >= cells.length || to >= cells.length) return cells;
  const key = cells[from].key;
  const effect = normalizeBlockEffect(groupEffect);
  if (from === to && JSON.stringify(cells[from].effect) === JSON.stringify(effect)) return cells;
  const moved = moveCellContent(cells, from, to);
  return moved.map(cell => cell.key === key ? { ...cell, effect } : cell);
}

/** The drawer captures its insertion point before it takes focus from the line. */
export function insertCellAfter(cells: LyricCellDraft[], cell: LyricCellDraft, afterKey: string | null): LyricCellDraft[] {
  const anchor = cells.findIndex(item => item.key === afterKey);
  const next = [...cells];
  const effect = anchor >= 0 ? normalizeBlockEffect(cells[anchor].effect) : undefined;
  const insideGroup = !cell.effect && effect?.connected && JSON.stringify(effect) === JSON.stringify(normalizeBlockEffect(cells[anchor + 1]?.effect));
  next.splice(anchor >= 0 ? anchor + 1 : next.length, 0, insideGroup ? { ...cell, effect } : cell);
  return next;
}

/** Replacing artwork keeps the block, its effect and its original timing slot. */
export function replaceCellImage(cells: LyricCellDraft[], key: string, sticker: LyricSticker): LyricCellDraft[] {
  return cells.map(cell => cell.key === key && cell.kind === "image" ? { ...cell, sticker } : cell);
}

export function cellsFromLine(line: LyricWordData[]): LyricCellDraft[] {
  return line.map((word) => ({ key: `slot-${word.index}`, originalIndex: word.index,
    kind: word.kind ?? "text", text: word.kind === "image" ? IMAGE_TOKEN : word.text,
    vocal: word.vocal ?? "", sticker: word.sticker, effect: normalizeBlockEffect(word.effect) }));
}

/** Upgrade the former edge-only sticker without losing any existing timestamps. */
export function migrateInlineStickers(lines: LyricWordData[][], legacy: LineStickers = {}) {
  let index = 0;
  return lines.map((line, lineIndex) => {
    const sticker = legacy[lineIndex];
    const next = [...line];
    if (sticker && !line.some((word) => word.kind === "image" && word.sticker?.id === sticker.id)) {
      const image: LyricWordData = { kind: "image", text: IMAGE_TOKEN, vocal: "", sticker, at: null, index: -1, lineIndex };
      if (sticker.position === "after") next.push(image); else next.unshift(image);
    }
    return next.map((word) => ({ ...word, index: index++, lineIndex }));
  });
}

export function collectInlineStickers(lines: LyricWordData[][], legacy: LineStickers = {}): LineStickers {
  const all = [...Object.values(legacy), ...lines.flat().flatMap((word) => word.kind === "image" && word.sticker ? [word.sticker] : [])];
  return Object.fromEntries(all.map((sticker, index) => [index, sticker]));
}
