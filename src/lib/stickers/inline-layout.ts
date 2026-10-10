import { groupEffectBlocks } from "../block-effects/types";
import { effectGeometry } from "../block-effects/catalog";
import type { LyricWordData } from "@/types/common.type";
import { groupThaiCharacters } from "@/lib/karaoke/cursor/lib";

/** Image cells take real layout space; they are not text glyphs or edge decorations. */
export function layoutInlineWords(words: LyricWordData[], fontSize: number, viewportWidth: number,
  measure: (text: string) => number, progress: number) {
  const units = words.map((word) => word.at === null ? 0 : word.kind === "image" ? 1 : groupThaiCharacters(word.text, []).length);
  const totalUnits = units.reduce((sum, count) => sum + count, 0);
  const insetLeft = words.map(() => 0), insetRight = words.map(() => 0);
  for (const run of groupEffectBlocks(words)) {
    const reserve = effectGeometry(1, fontSize, run.effect).outset;
    insetLeft[run.start] = reserve; insetRight[run.end] = reserve;
  }
  const contentWidths = words.map((word) => word.kind === "image"
    ? fontSize * Math.min(2, (word.sticker?.width ?? 1) / (word.sticker?.height ?? 1))
    : measure(word.text));
  const widths = contentWidths.map((width, index) => width + insetLeft[index] + insetRight[index]);
  const gaps = words.map((word, index) => index > 0 && (word.kind === "image" || words[index - 1].kind === "image") ? fontSize * 0.15 : 0);
  const total = widths.reduce((sum, width, index) => sum + width + gaps[index], 0);
  const scale = Math.min(1, viewportWidth * 0.94 / Math.max(1, total));
  let left = (viewportWidth - total * scale) / 2, consumed = 0;
  return words.map((word, index) => {
    left += gaps[index] * scale;
    const width = widths[index] * scale;
    const item = { word, left, width, contentLeft: left + insetLeft[index] * scale, contentWidth: contentWidths[index] * scale, height: fontSize * scale,
      progress: units[index] ? Math.max(0, Math.min(1, (progress * totalUnits - consumed) / units[index])) : 0 };
    left += width;
    consumed += units[index];
    return item;
  });
}
