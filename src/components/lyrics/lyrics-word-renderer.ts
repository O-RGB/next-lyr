import { roundedRect } from "@/lib/canvas/runtime";
import type { LyricWordData } from "@/types/common.type";

export const LYRICS_ROW_HEIGHT = 70;
export const LYRICS_LEFT_GUTTER = 36;
export const LYRICS_RIGHT_GUTTER = 34;
export const LYRICS_WORD_HEIGHT = 40;
export const LYRICS_WORD_GAP = 7;
// Keep only the padding-sized floor. Word length must remain visible in the
// layout: short words stay short and long words stay long.
export const LYRICS_MIN_WORD_WIDTH = 24;

export interface LyricWordBoxColors {
  fill: string;
  border: string;
  text: string;
  muted: string;
  marker?: string;
}

export interface LyricWordBoxOptions {
  fontFamily: string;
  fontSize?: number;
  vocalFontSize?: number;
  radius?: number;
  lineWidth?: number;
  markerWidth?: number;
  showText?: boolean;
}

export function measureLyricWords(
  ctx: CanvasRenderingContext2D,
  words: LyricWordData[],
  horizontalPadding = 24
): number[] {
  return words.map((word) =>
    Math.max(
      LYRICS_MIN_WORD_WIDTH,
      ctx.measureText(word.text).width + horizontalPadding
    )
  );
}

/**
 * The single lyric-box renderer used by both the editor and its overview.
 * Keeping this here prevents the overview from becoming a visually different
 * approximation of the real editor boxes.
 */
export function drawLyricWordBox(
  ctx: CanvasRenderingContext2D,
  word: LyricWordData,
  x: number,
  y: number,
  width: number,
  height: number,
  colors: LyricWordBoxColors,
  options: LyricWordBoxOptions
): void {
  const boxWidth = Math.max(1, width);
  const boxHeight = Math.max(1, height);
  const radius = Math.min(options.radius ?? 5, boxWidth / 2, boxHeight / 2);
  const fontSize = options.fontSize ?? 15;
  const vocalFontSize = options.vocalFontSize ?? 8;

  ctx.fillStyle = colors.fill;
  roundedRect(ctx, x, y, boxWidth, boxHeight, radius);
  ctx.fill();

  ctx.strokeStyle = colors.border;
  ctx.lineWidth = options.lineWidth ?? 1;
  roundedRect(ctx, x, y, boxWidth, boxHeight, radius);
  ctx.stroke();

  // Paint the status tab after the outline so the colour reaches the top and
  // bottom edge instead of looking inset behind the box border.
  if (colors.marker) {
    ctx.fillStyle = colors.marker;
    ctx.fillRect(x, y, Math.min(options.markerWidth ?? 3, boxWidth), boxHeight);
  }

  if (options.showText !== false) {
    ctx.save();
    roundedRect(ctx, x, y, boxWidth, boxHeight, radius);
    ctx.clip();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${fontSize}px ${options.fontFamily}`;
    ctx.fillStyle = colors.text;
    ctx.fillText(word.text, x + boxWidth / 2, y + boxHeight / 2);

    if (word.vocal && boxHeight >= 12) {
      ctx.font = `500 ${vocalFontSize}px ${options.fontFamily}`;
      ctx.fillStyle = colors.muted;
      ctx.fillText(word.vocal, x + boxWidth / 2, y + boxHeight - 6);
    }
    ctx.restore();
  }
}
