import type { LyricWordData } from "@/types/common.type";
import { layoutInlineWords } from "@/lib/stickers/inline-layout";
import { withEffectTextStyle } from "@/lib/block-effects/appearance";
import { normalizeBlockEffect } from "@/lib/block-effects/types";
import { placeEffectRuns } from "../block-effect-layer";
import type { CanvasImagePlacement } from "../canvas-media-layer";
import { drawCanvasText, type CanvasTextStyle } from "./canvas-renderer";

/** Playback and draft previews use identical text, image and effect geometry. */
export function drawInlineLyricLine(ctx: CanvasRenderingContext2D, words: LyricWordData[], progress: number,
  width: number, y: number, style: CanvasTextStyle, prefix: string) {
  const images: CanvasImagePlacement[] = [];
  ctx.font = `${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
  const layout = layoutInlineWords(words, style.fontSize, width, value => ctx.measureText(value).width, progress);
  const renderedSize = layout[0]?.height ?? style.fontSize;
  const renderedStroke = Math.max(1.2, style.strokeWidth * renderedSize / style.fontSize);
  const renderedStyle = { ...style, fontSize: renderedSize, strokeWidth: renderedStroke };
  ctx.save();
  ctx.font = `${style.fontWeight} ${renderedSize}px ${style.fontFamily}`;
  ctx.textBaseline = "middle";
  const metrics = ctx.measureText(words.filter(word => word.kind !== "image").map(word => word.text).join(""));
  const textBottom = y + (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent > 0
    ? metrics.actualBoundingBoxDescent : renderedSize * .35) + renderedStroke / 2;
  ctx.restore();
  const effects = placeEffectRuns(layout.map(item => ({
    word: item.word, left: item.contentLeft, width: item.contentWidth,
    top: (item.word.kind === "image" ? y + item.height / 2 : textBottom) - item.height,
    height: item.height, progress: item.progress,
  })), prefix);
  for (const item of layout) {
    if (item.word.kind === "image") {
      if (item.word.sticker) images.push({
        key: `${prefix}:${item.word.index}`, sticker: item.word.sticker,
        left: item.contentLeft, top: y - item.height / 2, width: item.contentWidth, height: item.height,
      });
    } else {
      const themed = withEffectTextStyle(renderedStyle, normalizeBlockEffect(item.word.effect)?.type);
      drawCanvasText(ctx, item.word.text, item.contentLeft + item.contentWidth / 2, y,
        item.progress, Math.max(1, item.contentWidth / .94), themed);
    }
  }
  return { images, effects };
}
