"use client";

import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";

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
 * The editor grid remains interactive DOM, while this presentation renderer
 * follows karaoke-web-online: lyrics are measured once per frame, highlighted
 * with a canvas clip, and animated by RAF without React re-rendering every
 * timer update.
 */
const LyricsPlayer: React.FC<LyricsPlayerProps> = ({
  textStyle,
  playerControls,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const processedRef = useRef(useKaraokeStore.getState().lyricsProcessed);
  const styleRef = useRef(textStyle);
  const topSlotRef = useRef<CanvasSlot>(makeCanvasSlot());
  const bottomSlotRef = useRef<CanvasSlot>(makeCanvasSlot());
  const lastTickRef = useRef(0);
  const dirtyRef = useRef(true);
  const dprRef = useRef(1);
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
    markDirty();
  }, [markDirty, textStyle]);

  useEffect(() => {
    const fontsReady = document.fonts?.ready;
    if (!fontsReady) return;
    void fontsReady.then(markDirty);
  }, [markDirty, textStyle]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const lyricRange = processedRef.current;
    if (!canvas || !lyricRange || lyricRange.ranges.length === 0) {
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

    const mainSize = getFontSize(styleRef.current, width, height);
    const vocalSize = Math.max(10, mainSize * 0.42);
    const lineBlock = mainSize * 1.45 + vocalSize;
    const lineGap = mainSize * 0.55;
    const totalHeight = lineBlock * 2 + lineGap;
    const firstY = Math.max(
      mainSize,
      height / 2 - totalHeight / 2 + mainSize / 2
    );
    const secondY = firstY + lineBlock + lineGap;
    const style = getTextStyle(
      styleRef.current,
      mainSize,
      getComputedStyle(canvas).fontFamily || "sans-serif"
    );

    drawSentence(ctx, topSentence, topSlotRef.current.progress, width, firstY, style, vocalSize);
    drawSentence(ctx, bottomSentence, bottomSlotRef.current.progress, width, secondY, style, vocalSize);

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
          className="block h-full w-full"
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
  const fallback = width >= 768 ? 36 : 24;
  const size = Number.isFinite(configured) && configured > 0 ? configured : fallback;
  return Math.max(12, Math.min(size, height * 0.25));
}

function getTextStyle(
  textStyle: LyricsCharacterStyle | undefined,
  fontSize: number,
  fontFamily: string
): CanvasTextStyle {
  return {
    fontSize,
    fontWeight: textStyle?.fontWeight ?? 700,
    // Match karaoke-web-online's actual canvas mapping. The field names in
    // this project are historical, so keep the rendered roles explicit here:
    // unsung = yellow/black and sung = blue/white.
    unsungFill: textStyle?.color?.color ?? "#fcfe17",
    unsungStroke: textStyle?.activeColor?.color ?? "#000000",
    sungFill: textStyle?.color?.colorBorder ?? "#0000ff",
    sungStroke: textStyle?.activeColor?.colorBorder ?? "#ffffff",
    fontFamily,
    strokeWidth: Math.max(fontSize * 0.08, 2),
  };
}

function drawSentence(
  ctx: CanvasRenderingContext2D,
  sentence: ISentence | undefined,
  progress: number,
  width: number,
  y: number,
  style: CanvasTextStyle,
  vocalSize: number
): void {
  if (!sentence) return;
  drawCanvasText(ctx, sentence.text, width / 2, y, progress, width, style);

  if (!sentence.vocal.trim()) return;
  drawCanvasText(
    ctx,
    sentence.vocal,
    width / 2,
    y + style.fontSize * 0.72,
    progress,
    width,
    {
      ...style,
      fontSize: vocalSize,
      unsungFill: "#0000ff",
      unsungStroke: "#ffffff",
      sungFill: "#df692e",
      sungStroke: "#000000",
      strokeWidth: Math.max(vocalSize * 0.1, 1.5),
    }
  );
}

function clearCanvas(canvas: HTMLCanvasElement | null): void {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export default React.memo(LyricsPlayer);
