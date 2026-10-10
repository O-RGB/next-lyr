"use client";

import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";

import type { EffectPlacement } from "../block-effect-layer";
import { defaultLyricTextStyle } from "@/lib/block-effects/appearance";
import { weatherHeadroomPadding } from "@/lib/block-effects/weather";
import { drawInlineLyricLine } from "./inline-renderer";
import { layoutInlineWords } from "@/lib/stickers/inline-layout";
import { makeCanvasMediaLayer, updateCanvasMediaLayer, clearCanvasMediaLayer, type CanvasImagePlacement } from "../canvas-media-layer";
import type { ISentence } from "@/lib/array-range";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { useTimerStore } from "@/timer-worker/store";
import type { LyricsCharacterStyle } from "../lyrics-character";
import {
  drawCanvasText,
  getSentenceProgress,
  makeCanvasSlot,
  type CanvasSlot,
  type CanvasTextStyle,
  updateCanvasSlot,
} from "./canvas-renderer";

interface LyricsPlayerProps {
  textStyle?: LyricsCharacterStyle;
  playerControls?: ReactNode | null;
}

const LINE_HOLD_MS = 100;

/**
 * Canvas karaoke preview.
 *
 * Text, inline images, GIF frames and effects share one visible canvas.
 * Media animation reuses the cached text surface without React timer renders.
 */
const LyricsPlayer: React.FC<LyricsPlayerProps> = ({
  textStyle,
  playerControls,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaLayer = useRef(makeCanvasMediaLayer());
  useEffect(() => { const layer = mediaLayer.current; return () => clearCanvasMediaLayer(layer); }, []);
  const processedRef = useRef(useKaraokeStore.getState().lyricsProcessed);
  const styleRef = useRef(textStyle);
  const topSlotRef = useRef<CanvasSlot>(makeCanvasSlot());
  const bottomSlotRef = useRef<CanvasSlot>(makeCanvasSlot());
  const lastTickRef = useRef(0);
  const dirtyRef = useRef(true);
  const dprRef = useRef(1);
  const layoutRef = useRef<{
    topIndex: number;
    bottomIndex: number;
    topY: number;
    bottomY: number;
    width: number;
    height: number;
  } | null>(null);
  const frameRef = useRef<number | null>(null);
  const drawFrameRef = useRef<() => void>(() => undefined);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    topSlotRef.current.dirty = true;
    bottomSlotRef.current.dirty = true;
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      drawFrameRef.current();
    });
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, canvas.clientWidth || canvas.parentElement?.clientWidth || 300);
    const height = Math.max(1, canvas.clientHeight || canvas.parentElement?.clientHeight || 160);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);

    dprRef.current = dpr;
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    layoutRef.current = null;
    markDirty();
  }, [markDirty]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);
    window.addEventListener("resize", resizeCanvas);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [resizeCanvas]);

  useEffect(() => {
    const updateProcessed = (processed: typeof processedRef.current) => {
      processedRef.current = processed;
      topSlotRef.current = makeCanvasSlot();
      bottomSlotRef.current = makeCanvasSlot();
      lastTickRef.current = 0;
      layoutRef.current = null;
      markDirty();
    };

    updateProcessed(useKaraokeStore.getState().lyricsProcessed);
    return useKaraokeStore.subscribe((next, previous) => {
      if (next.lyricsProcessed !== previous.lyricsProcessed) {
        updateProcessed(next.lyricsProcessed);
      }
    });
  }, [markDirty]);

  useEffect(() => {
    styleRef.current = textStyle;
    layoutRef.current = null;
    markDirty();
  }, [markDirty, textStyle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !document.fonts) return;
    let mounted = true;
    const redraw = () => { if (mounted) { layoutRef.current = null; markDirty(); } };
    const loadFont = () => {
      const family = getComputedStyle(canvas).fontFamily || "sans-serif";
      const weight = styleRef.current?.fontWeight ?? 700;
      // Canvas can request a weight that the surrounding UI has not used yet.
      // Load it explicitly before retaining measured glyph widths or effect roots.
      void document.fonts.load(`${weight} 32px ${family}`, "Ag กข").then(redraw, redraw);
      redraw();
    };
    loadFont();
    document.fonts.addEventListener("loadingdone", redraw);
    const observer = new MutationObserver(loadFont);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    return () => { mounted = false; observer.disconnect(); document.fonts.removeEventListener("loadingdone", redraw); };
  }, [markDirty, textStyle]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const lyricRange = processedRef.current;
    if (!canvas || !lyricRange || lyricRange.ranges.length === 0) {
      clearCanvasMediaLayer(mediaLayer.current);
      if (dirtyRef.current) {
        clearCanvas(canvas);
        dirtyRef.current = false;
      }
      return;
    }

    const timerState = useTimerStore.getState();
    const tick = timerState.presentationValue;
    const active = lyricRange.search(tick);
    let groupIndex = active?.index ?? -1;
    if (groupIndex < 0 && tick >= lyricRange.ranges[0].key[0]) {
      groupIndex = lyricRange.ranges.length - 1;
    }

    const jump = Math.abs(tick - lastTickRef.current) > 1000;
    lastTickRef.current = tick;

    const topIndex = getDisplayIndex(groupIndex, "top");
    const bottomIndex = getDisplayIndex(groupIndex, "bottom");
    const topActive = groupIndex === topIndex;
    const bottomActive = groupIndex === bottomIndex;
    const topSentence = sentenceAt(lyricRange.ranges, topIndex);
    const bottomSentence = sentenceAt(lyricRange.ranges, bottomIndex);

    updateCanvasSlot(
      topSlotRef.current,
      topIndex,
      getTargetProgress(tick, topSentence, topActive),
      performance.now(),
      LINE_HOLD_MS,
      jump
    );
    updateCanvasSlot(
      bottomSlotRef.current,
      bottomIndex,
      getTargetProgress(tick, bottomSentence, bottomActive),
      performance.now(),
      LINE_HOLD_MS,
      jump
    );

    if (
      !dirtyRef.current &&
      !topSlotRef.current.dirty &&
      !bottomSlotRef.current.dirty
    ) {
      return;
    }

    const dpr = dprRef.current;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const configuredSize = getFontSize(styleRef.current, width, height);
    let style = getTextStyle(styleRef.current, configuredSize,
      getComputedStyle(canvas).fontFamily || "sans-serif");
    ctx.font = `${style.fontWeight} ${configuredSize}px ${style.fontFamily}`;
    const fitSizes = [topSentence, bottomSentence].flatMap((sentence) => {
      if (!sentence) return [];
      if (sentence.words?.some((word) => word.kind === "image" || word.effect)) {
        return [layoutInlineWords(sentence.words, configuredSize, width, (text) => ctx.measureText(text).width, 0)[0]?.height ?? configuredSize];
      }
      return [configuredSize * Math.min(1, width * .94 / Math.max(1, ctx.measureText(sentence.text).width))];
    });
    const topWeatherRatio=Math.max(0,...(topSentence?.words??[]).map(word=>weatherHeadroomPadding(word.effect)));
    const bottomWeatherRatio=Math.max(0,...(bottomSentence?.words??[]).map(word=>weatherHeadroomPadding(word.effect)));
    const mainSize = Math.max(12, Math.min(configuredSize, ...fitSizes, height/(4+topWeatherRatio+bottomWeatherRatio)));
    const topWeatherPad=mainSize*topWeatherRatio,bottomWeatherPad=mainSize*bottomWeatherRatio;
    style = { ...style, fontSize: mainSize, strokeWidth: Math.max(1.2, style.strokeWidth * mainSize / configuredSize) };
    const vocalSize = Math.max(10, mainSize * .42);
    const fontFamily = style.fontFamily;
    const mainMetrics = measureCanvasTextVertical(
      ctx,
      style.fontWeight,
      mainSize,
      fontFamily,
      style.strokeWidth
    );
    const vocalMetrics = measureCanvasTextVertical(
      ctx,
      style.fontWeight,
      vocalSize,
      fontFamily,
      Math.max(vocalSize * 0.1, 1.5)
    );
    const topLineBlock =
      topWeatherPad + mainMetrics.ascent +
      (topSentence?.vocal.trim()
        ? mainSize * 0.72 + vocalMetrics.descent
        : mainMetrics.descent);
    const bottomLineBlock =
      bottomWeatherPad + mainMetrics.ascent +
      (bottomSentence?.vocal.trim()
        ? mainSize * 0.72 + vocalMetrics.descent
        : mainMetrics.descent);
    const lineGap = mainSize * 0.55;
    const totalHeight = topLineBlock + bottomLineBlock + lineGap;
    const centeredTop = (height - totalHeight) / 2;
    const centeredFirstY = centeredTop + topWeatherPad + mainMetrics.ascent;
    const centeredSecondY = centeredFirstY + topLineBlock + lineGap + bottomWeatherPad - topWeatherPad;

    const previousLayout = layoutRef.current;
    const sizeChanged =
      !previousLayout ||
      Math.abs(previousLayout.width - width) > 0.5 ||
      Math.abs(previousLayout.height - height) > 0.5;
    const topChanged = !previousLayout || previousLayout.topIndex !== topIndex;
    const bottomChanged =
      !previousLayout || previousLayout.bottomIndex !== bottomIndex;

    let firstY = centeredFirstY;
    let secondY = centeredSecondY;

    if (previousLayout && !sizeChanged) {
      if (topChanged && !bottomChanged) {
        // Keep the unchanged bottom line fixed while the top lyric changes.
        secondY = previousLayout.bottomY;
        firstY = secondY - topLineBlock - lineGap - bottomWeatherPad + topWeatherPad;
      } else if (bottomChanged && !topChanged) {
        // Keep the unchanged top line fixed while the bottom lyric changes.
        firstY = previousLayout.topY;
        secondY = firstY + topLineBlock + lineGap + bottomWeatherPad - topWeatherPad;
      } else if (!topChanged && !bottomChanged) {
        // Subtitles/progress can change without moving either lyric line.
        firstY = previousLayout.topY;
        secondY = previousLayout.bottomY;
      }
    }

    layoutRef.current = {
      topIndex,
      bottomIndex,
      topY: firstY,
      bottomY: secondY,
      width,
      height,
    };

    const rendered = [
      drawSentence(ctx, topSentence, topSlotRef.current.progress, width, firstY, style, vocalSize),
      drawSentence(ctx, bottomSentence, bottomSlotRef.current.progress, width, secondY, style, vocalSize),
    ];
    updateCanvasMediaLayer(mediaLayer.current, canvas, useKaraokeStore.getState().projectId,
      rendered.flatMap((line) => line.images), rendered.flatMap((line) => line.effects));

    dirtyRef.current = false;
    topSlotRef.current.dirty = false;
    bottomSlotRef.current.dirty = false;
  }, []);

  useEffect(() => {
    drawFrameRef.current = drawFrame;
    markDirty();
  }, [drawFrame, markDirty]);

  useEffect(() => {
    const unsubscribe = useTimerStore.subscribe((next, previous) => {
      if (
        next.presentationValue !== previous.presentationValue ||
        next.presentationRunning !== previous.presentationRunning
      ) {
        markDirty();
      }
    });
    return () => {
      unsubscribe();
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [markDirty]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="relative flex min-h-0 flex-1 w-full items-center justify-center overflow-hidden rounded-lg text-center">
        <canvas
          ref={canvasRef}
          aria-label="Karaoke lyrics preview"
          className="relative block h-full w-full"
          style={{ fontFamily: "var(--font-lyrics)" }}
        />
      </div>
      {playerControls}
    </div>
  );
};

function sentenceAt(
  ranges: Array<{ value: { value: ISentence } }>,
  index: number
): ISentence | undefined {
  if (index < 0 || index >= ranges.length) return undefined;
  return ranges[index].value.value;
}

function getDisplayIndex(groupIndex: number, side: "top" | "bottom"): number {
  if (groupIndex < 0) return side === "top" ? 0 : 1;
  const activeSide = groupIndex % 2 === 0 ? "top" : "bottom";
  return activeSide === side ? groupIndex : groupIndex + 1;
}

function getTargetProgress(
  tick: number,
  sentence: ISentence | undefined,
  active: boolean
): number {
  if (!sentence) return 0;
  return active ? getSentenceProgress(tick, sentence) : tick >= sentence.start ? 1 : 0;
}

function getFontSize(
  textStyle: LyricsCharacterStyle | undefined,
  width: number,
  height: number
): number {
  const configured = Number(textStyle?.fontSize);
  const fallback = width >= 768 ? 44 : 28;
  const size = Number.isFinite(configured) && configured > 0 ? configured : fallback;
  return Math.max(12, Math.min(size, height * 0.25));
}

function getTextStyle(
  textStyle: LyricsCharacterStyle | undefined,
  fontSize: number,
  fontFamily: string
): CanvasTextStyle {
  const base = defaultLyricTextStyle(fontSize, fontFamily);
  return {
    ...base,
    fontWeight: textStyle?.fontWeight ?? 700,
    unsungFill: textStyle?.color?.color ?? base.unsungFill,
    unsungStroke: textStyle?.activeColor?.color ?? base.unsungStroke,
    sungFill: textStyle?.color?.colorBorder ?? base.sungFill,
    sungStroke: textStyle?.activeColor?.colorBorder ?? base.sungStroke,
  };
}

function drawSentence(
  ctx: CanvasRenderingContext2D, sentence: ISentence | undefined, progress: number,
  width: number, y: number, style: CanvasTextStyle, vocalSize: number
): { images: CanvasImagePlacement[]; effects: EffectPlacement[] } {
  if (!sentence) return { images: [], effects: [] };
  const images: CanvasImagePlacement[] = [];
  let effects: EffectPlacement[] = [];
  if (sentence.words?.some((word) => word.kind === "image" || word.effect)) {
    const scene = drawInlineLyricLine(ctx, sentence.words, progress, width, y, style, `preview:${sentence.lineIndex}`);
    images.push(...scene.images);
    effects = scene.effects;
  } else drawCanvasText(ctx, sentence.text, width / 2, y, progress, width, style);
  if (sentence.vocal.trim()) drawCanvasText(ctx, sentence.vocal, width / 2,
    y + style.fontSize * 0.72, progress, width, { ...style, fontSize: vocalSize,
      unsungFill: "#b8c4da", unsungStroke: "#29334b", sungFill: "#fff0bf", sungStroke: "#29334b",
      unsungGradient: undefined, sungGradient: undefined, glowBlur: 0, strokeWidth: Math.max(vocalSize * .06, 1) });
  return { images, effects };
}

function measureCanvasTextVertical(
  ctx: CanvasRenderingContext2D,
  fontWeight: number | string,
  fontSize: number,
  fontFamily: string,
  strokeWidth: number
): { ascent: number; descent: number } {
  ctx.save();
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText("Ag");
  const ascent =
    (metrics.actualBoundingBoxAscent || fontSize * 0.8) + strokeWidth / 2;
  const descent =
    (metrics.actualBoundingBoxDescent || fontSize * 0.2) + strokeWidth / 2;
  ctx.restore();
  return { ascent, descent };
}

function clearCanvas(canvas: HTMLCanvasElement | null): void {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export default React.memo(LyricsPlayer);
