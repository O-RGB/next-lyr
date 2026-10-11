import { normalizeBlockEffect, type BlockEffect } from "@next-karaoke/lyrics/effects";
import type { LyricWordData } from "@/types/common.type";
import type { LineStickers, LyricSticker } from "@next-karaoke/lyrics/media";

// One timing unit for an image; renderers display its asset, never this marker.
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

/** Reorder content only. The destination keeps its original timing slot. */
export function moveCellContent(cells: LyricCellDraft[], from: number, to: number): LyricCellDraft[] {
  if (from < 0 || to < 0 || from >= cells.length || to >= cells.length || from === to) return cells;
  const content = [...cells];
  content.splice(to, 0, content.splice(from, 1)[0]);
  return content.map((cell, index) => ({ ...cell, originalIndex: cells[index].originalIndex }));
}

/** The drawer captures its insertion point before it takes focus from the line. */
export function insertCellAfter(cells: LyricCellDraft[], cell: LyricCellDraft, afterKey: string | null): LyricCellDraft[] {
  const anchor = cells.findIndex(item => item.key === afterKey);
  const next = [...cells];
  next.splice(anchor >= 0 ? anchor + 1 : next.length, 0, cell);
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
      const at = sticker.position === "after" ? line.at(-1)?.at ?? null : line[0]?.at ?? null;
      const image: LyricWordData = { kind: "image", text: IMAGE_TOKEN, vocal: "", sticker, at, index: -1, lineIndex };
      if (sticker.position === "after") next.push(image); else next.unshift(image);
    }
    return next.map((word) => ({ ...word, index: index++, lineIndex }));
  });
}

export function collectInlineStickers(lines: LyricWordData[][], legacy: LineStickers = {}): LineStickers {
  const all = [...Object.values(legacy), ...lines.flat().flatMap((word) => word.kind === "image" && word.sticker ? [word.sticker] : [])];
  return Object.fromEntries(all.map((sticker, index) => [index, sticker]));
}
