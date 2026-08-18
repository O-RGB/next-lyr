"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";

import { resizeCanvas } from "@/lib/canvas/runtime";
import type { LyricWordData } from "@/types/common.type";
import { isPreviewHorizontal } from "@/components/panel/preview-orientation";
import {
  drawLyricWordBox,
  LYRICS_LEFT_GUTTER,
  LYRICS_RIGHT_GUTTER,
  LYRICS_ROW_HEIGHT,
  LYRICS_WORD_GAP,
  LYRICS_WORD_HEIGHT,
  measureLyricWords,
} from "@/components/lyrics/lyrics-word-renderer";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { useTimerStore } from "@/timer-worker/store";
import {
  clampLyricsPreviewValue,
  getLyricsPreviewViewport,
  LYRICS_PREVIEW_VIEWPORT_EVENT,
  requestLyricsPreviewScroll,
  type LyricsPreviewViewport,
} from "@/components/lyrics/lyrics-preview-sync";

const OVERVIEW_RENDER_SCALE = 0.95;

interface PreviewWord {
  position: number;
  word: LyricWordData;
  at: number | null;
}

interface PreviewLine {
  words: PreviewWord[];
}

interface CanvasColors {
  background: string;
  line: string;
  text: string;
  muted: string;
  box: string;
  past: string;
  timed: string;
  active: string;
  cursor: string;
  viewport: string;
  viewportBorder: string;
}

interface LyricsOverviewPreviewProps {
  compact?: boolean;
}

function getColors(): CanvasColors {
  const isDark = document.documentElement.classList.contains("dark");
  return isDark
    ? {
        background: "#131a23",
        line: "#3b4a5d",
        text: "#f4f7fb",
        muted: "#8795a8",
        box: "#18212d",
        past: "#263241",
        timed: "#49d17d",
        active: "#f6dc67",
        cursor: "#f6dc67",
        viewport: "rgba(120,170,255,0.12)",
        viewportBorder: "#78aaff",
      }
    : {
        background: "#f2f5f9",
        line: "#c9d2df",
        text: "#1c2430",
        muted: "#7b8796",
        box: "#ffffff",
        past: "#d8dee8",
        timed: "#1caa58",
        active: "#f0d14b",
        cursor: "#f0d14b",
        viewport: "rgba(40,120,232,0.10)",
        viewportBorder: "#2878e8",
      };
}

function findLastTimedPosition(
  timedPositions: Array<{ position: number; at: number }>,
  tick: number
): number {
  let low = 0;
  let high = timedPositions.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (timedPositions[middle].at <= tick) low = middle + 1;
    else high = middle;
  }
  return low > 0 ? timedPositions[low - 1].position : -1;
}

function renderLyricsSourceCanvas(
  source: HTMLCanvasElement,
  lines: PreviewLine[],
  width: number,
  colors: CanvasColors,
  fontFamily: string,
  activePosition: number
): void {
  const height = Math.max(1, lines.length * LYRICS_ROW_HEIGHT);
  if (source.width !== width) source.width = width;
  if (source.height !== height) source.height = height;

  const ctx = source.getContext("2d", { alpha: false });
  if (!ctx) return;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = "middle";
  ctx.font = `600 15px ${fontFamily}`;

  lines.forEach((line, lineIndex) => {
    const y = lineIndex * LYRICS_ROW_HEIGHT;
    const activeLine = line.words.some(
      (entry) => entry.position === activePosition
    );
    ctx.fillStyle = activeLine
      ? "rgba(246,220,103,0.14)"
      : lineIndex % 2 === 0
        ? colors.background
        : colors.box;
    ctx.fillRect(0, y, width, LYRICS_ROW_HEIGHT);
    ctx.fillStyle = colors.line;
    ctx.fillRect(0, y + LYRICS_ROW_HEIGHT - 1, width, 1);

    const wordWidths = measureLyricWords(
      ctx,
      line.words.map((entry) => entry.word)
    );
    const startX = LYRICS_LEFT_GUTTER + 8;
    const availableWidth = Math.max(
      1,
      width - LYRICS_LEFT_GUTTER - LYRICS_RIGHT_GUTTER - 16
    );
    let x = startX;

    ctx.save();
    ctx.beginPath();
    ctx.rect(startX, y, availableWidth, LYRICS_ROW_HEIGHT);
    ctx.clip();
    line.words.forEach((entry, wordIndex) => {
      const isPast = activePosition >= 0 && entry.position < activePosition;
      const isActive = entry.position === activePosition;
      const boxWidth = wordWidths[wordIndex] ?? 24;
      drawLyricWordBox(
        ctx,
        entry.word,
        x,
        y + (LYRICS_ROW_HEIGHT - LYRICS_WORD_HEIGHT) / 2,
        boxWidth,
        LYRICS_WORD_HEIGHT,
        {
          fill: isActive ? colors.active : isPast ? colors.past : colors.box,
          border: isActive ? colors.active : colors.line,
          text: isPast ? colors.muted : colors.text,
          muted: colors.muted,
          marker: entry.at !== null ? colors.timed : undefined,
        },
        {
          fontFamily,
          fontSize: 15,
          vocalFontSize: 8,
          radius: 5,
          lineWidth: isActive ? 2 : 1,
          markerWidth: 3,
        }
      );
      x += boxWidth + LYRICS_WORD_GAP;
    });
    ctx.restore();
  });
}

function getLyricsContentWidth(
  ctx: CanvasRenderingContext2D,
  lines: PreviewLine[],
  fallbackWidth: number,
  fontFamily: string
): number {
  ctx.font = `600 15px ${fontFamily}`;
  const startX = LYRICS_LEFT_GUTTER + 8;
  let longestLine = 0;

  for (const line of lines) {
    const wordWidths = measureLyricWords(
      ctx,
      line.words.map((entry) => entry.word)
    );
    const contentWidth =
      wordWidths.reduce((sum, value) => sum + value, 0) +
      Math.max(0, wordWidths.length - 1) * LYRICS_WORD_GAP;
    longestLine = Math.max(longestLine, contentWidth);
  }

  return Math.max(
    1,
    lines.length > 0
      ? Math.ceil(startX + longestLine + LYRICS_RIGHT_GUTTER + 8)
      : Math.max(1, fallbackWidth)
  );
}

const LyricsOverviewPreview: React.FC<LyricsOverviewPreviewProps> = () => {
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const timingBuffer = useKaraokeStore((state) => state.timingBuffer);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef({ width: 1, height: 1, dpr: 1 });
  const viewportRef = useRef<LyricsPreviewViewport>(
    getLyricsPreviewViewport()
  );
  const activePositionRef = useRef(-1);
  const frameRef = useRef<number | null>(null);
  const dirtyRef = useRef(true);
  const drawRef = useRef<() => void>(() => undefined);
  const draggingRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const didDragRef = useRef(false);
  const dragCenterOffsetRef = useRef(0.5);

  const lines = useMemo<PreviewLine[]>(() => {
    let position = 0;
    return lyricsData.map((line) => ({
      words: line.map((word) => {
        const buffered = timingBuffer?.buffer.get(word.index);
        return {
          position: position++,
          word,
          at: buffered !== undefined ? buffered.at : word.at,
        };
      }),
    }));
  }, [lyricsData, timingBuffer]);

  const positionByIndex = useMemo(() => {
    const result = new Map<number, number>();
    lines.forEach((line) =>
      line.words.forEach((entry) => result.set(entry.word.index, entry.position))
    );
    return result;
  }, [lines]);

  const timedPositions = useMemo(
    () =>
      lines
        .flatMap((line) =>
          line.words.flatMap((entry) =>
            entry.at === null ? [] : [{ position: entry.position, at: entry.at }]
          )
        )
        .sort((left, right) => left.at - right.at),
    [lines]
  );

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      if (dirtyRef.current) drawRef.current();
    });
  }, []);

  const syncActivePosition = useCallback(() => {
    const state = useKaraokeStore.getState();
    if (state.isPlaying && state.playbackIndex !== null) {
      const position = positionByIndex.get(state.playbackIndex);
      if (position !== undefined) {
        activePositionRef.current = position;
        markDirty();
        return;
      }
    }

    activePositionRef.current = findLastTimedPosition(
      timedPositions,
      useTimerStore.getState().presentationValue
    );
    markDirty();
  }, [markDirty, positionByIndex, timedPositions]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const { width, height, dpr } = sizeRef.current;
    const colors = getColors();
    const horizontal = isPreviewHorizontal(width, height);
    const lineCount = Math.max(1, lines.length);
    const activePosition = activePositionRef.current;
    const fontFamily = getComputedStyle(canvas).fontFamily || "sans-serif";
    const activeLineIndex = lines.findIndex((line) =>
      line.words.some((entry) => entry.position === activePosition)
    );

    const viewport = viewportRef.current;
    const sourceCanvas = sourceCanvasRef.current ?? document.createElement("canvas");
    sourceCanvasRef.current = sourceCanvas;
    const sourceContext = sourceCanvas.getContext("2d", { alpha: false });
    if (!sourceContext) return;
    const sourceWidth = getLyricsContentWidth(
      sourceContext,
      lines,
      viewport.editorWidth,
      fontFamily
    );
    renderLyricsSourceCanvas(
      sourceCanvas,
      lines,
      sourceWidth,
      colors,
      fontFamily,
      activePosition
    );

    const sourceHeight = Math.max(1, lines.length * LYRICS_ROW_HEIGHT);
    // The longest lyric determines the crop on the content axis. The two
    // axes are then fitted independently, like a minimap: the document fills
    // the available preview, while shorter lines keep their real empty tail.
    const drawWidth = horizontal ? height : width;
    const drawHeight = horizontal ? width : height;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);
    if (lines.length > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      if (horizontal) {
        ctx.save();
        // The source document runs top -> bottom. Rotate it so line 1 starts
        // at the left edge and later lines continue left -> right, matching
        // the horizontal Chord overview.
        // After -90° rotation the source width becomes the target height,
        // so translate by drawWidth to bring the rotated image back into the
        // visible canvas instead of leaving it below the viewport.
        ctx.translate(0, drawWidth);
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(
          sourceCanvas,
          0,
          0,
          sourceWidth,
          sourceHeight,
          0,
          0,
          drawWidth,
          drawHeight
        );
        ctx.restore();
      } else {
        ctx.drawImage(
          sourceCanvas,
          0,
          0,
          sourceWidth,
          sourceHeight,
          0,
          0,
          drawWidth,
          drawHeight
        );
      }
    } else if (lines.length === 0) {
      ctx.fillStyle = colors.muted;
      ctx.font = "500 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No lyrics", width / 2, height / 2);
    }

    const axisSize = horizontal ? width : height;
    const viewportSize = Math.max(
      2 / Math.max(1, axisSize),
      clampLyricsPreviewValue(viewport.size)
    );
    const viewportStart = Math.min(
      clampLyricsPreviewValue(viewport.start),
      Math.max(0, 1 - viewportSize)
    );
    const viewportPoint = viewportStart * axisSize;
    const viewportLength = Math.min(
      axisSize - viewportPoint,
      viewportSize * axisSize
    );
    ctx.fillStyle = colors.viewport;
    if (horizontal) {
      ctx.fillRect(viewportPoint, 0, Math.max(2, viewportLength), height);
    } else {
      ctx.fillRect(0, viewportPoint, width, Math.max(2, viewportLength));
    }
    ctx.strokeStyle = colors.viewportBorder;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      horizontal ? viewportPoint + 0.5 : 0.5,
      horizontal ? 0.5 : viewportPoint + 0.5,
      horizontal ? Math.max(2, viewportLength - 1) : Math.max(1, width - 1),
      horizontal ? Math.max(1, height - 1) : Math.max(2, viewportLength - 1)
    );

    if (activeLineIndex >= 0) {
      const cursorPosition =
        ((activeLineIndex + 0.5) / lineCount) * axisSize;
      ctx.strokeStyle = colors.cursor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (horizontal) {
        ctx.moveTo(Math.round(cursorPosition) + 0.5, 0);
        ctx.lineTo(Math.round(cursorPosition) + 0.5, height);
      } else {
        ctx.moveTo(0, Math.round(cursorPosition) + 0.5);
        ctx.lineTo(width, Math.round(cursorPosition) + 0.5);
      }
      ctx.stroke();
    }

    dirtyRef.current = false;
  }, [lines]);

  drawRef.current = draw;

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = Math.max(
      1,
      canvas.clientWidth || canvas.parentElement?.clientWidth || 1
    );
    const height = Math.max(
      1,
      canvas.clientHeight || canvas.parentElement?.clientHeight || 1
    );
    const dpr = OVERVIEW_RENDER_SCALE;
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    sizeRef.current = { width, height, dpr };
    markDirty();
  }, [markDirty]);

  useEffect(() => {
    resize();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [resize]);

  useEffect(() => {
    markDirty();
    syncActivePosition();
  }, [lines, markDirty, syncActivePosition]);

  useEffect(() => {
    viewportRef.current = getLyricsPreviewViewport();
    const handleViewport = (event: Event) => {
      const viewport = (event as CustomEvent<LyricsPreviewViewport>).detail;
      if (!viewport) return;
      viewportRef.current = viewport;
      markDirty();
    };
    window.addEventListener(LYRICS_PREVIEW_VIEWPORT_EVENT, handleViewport);
    return () =>
      window.removeEventListener(LYRICS_PREVIEW_VIEWPORT_EVENT, handleViewport);
  }, [markDirty]);

  useEffect(() => {
    const unsubscribeTimer = useTimerStore.subscribe((next, previous) => {
      if (
        next.presentationValue !== previous.presentationValue ||
        next.presentationRunning !== previous.presentationRunning
      ) {
        syncActivePosition();
      }
    });
    const unsubscribeKaraoke = useKaraokeStore.subscribe((next, previous) => {
      if (
        next.playbackIndex !== previous.playbackIndex ||
        next.isPlaying !== previous.isPlaying
      ) {
        syncActivePosition();
      }
    });
    syncActivePosition();
    return () => {
      unsubscribeTimer();
      unsubscribeKaraoke();
    };
  }, [syncActivePosition]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    []
  );

  const updatePointer = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const horizontal = isPreviewHorizontal(rect.width, rect.height);
      const point = horizontal
        ? event.clientX - rect.left
        : event.clientY - rect.top;
      const length = horizontal ? rect.width : rect.height;
      const position = clampLyricsPreviewValue(
        (point - 4) / Math.max(1, length - 8)
      );
      const viewportSize = clampLyricsPreviewValue(viewportRef.current.size);
      const start = Math.min(
        clampLyricsPreviewValue(position - dragCenterOffsetRef.current),
        Math.max(0, 1 - viewportSize)
      );
      viewportRef.current = {
        ...viewportRef.current,
        start,
        size: viewportSize,
      };
      requestLyricsPreviewScroll(start);
      markDirty();
    },
    [markDirty]
  );

  return (
    <section className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-md border border-line bg-panel">
      <canvas
        ref={canvasRef}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          draggingRef.current = true;
          didDragRef.current = false;
          dragCenterOffsetRef.current =
            clampLyricsPreviewValue(viewportRef.current.size) / 2;
          pointerStartRef.current = { x: event.clientX, y: event.clientY };
          updatePointer(event);
        }}
        onPointerMove={(event) => {
          if (!draggingRef.current) return;
          if (
            Math.abs(event.clientX - pointerStartRef.current.x) > 2 ||
            Math.abs(event.clientY - pointerStartRef.current.y) > 2
          ) {
            didDragRef.current = true;
          }
          updatePointer(event);
        }}
        onPointerUp={(event) => {
          if (!draggingRef.current) return;
          updatePointer(event);
          draggingRef.current = false;
          didDragRef.current = false;
          dragCenterOffsetRef.current = 0.5;
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
          didDragRef.current = false;
          dragCenterOffsetRef.current = 0.5;
          viewportRef.current = getLyricsPreviewViewport();
          markDirty();
        }}
        className="block min-h-0 min-w-0 flex-1 cursor-crosshair touch-none"
        aria-label="Lyrics overview. Click or drag to scroll."
      />
    </section>
  );
};

export default React.memo(LyricsOverviewPreview);
