"use client";

import React, { useCallback, useEffect, useRef } from "react";

import useIsMobile from "@/hooks/useIsMobile";
import { usePlayerSetupStore } from "@/hooks/usePlayerSetup";
import { resizeCanvas, roundedRect } from "@/lib/canvas/runtime";
import { findChordForRange } from "@/lib/karaoke/chords/lookup";
import type { ChordEvent } from "@/lib/karaoke/midi/types";
import type { IMidiParseResult } from "@/lib/karaoke/midi/types";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { useTimerStore } from "@/timer-worker/store";
import type { BeatInfo } from "@/timer-worker/types";

const SUBDIVISIONS = 4;
const MAX_DEPTH = 3;
const DEFAULT_BEAT: BeatInfo = {
  measure: 1,
  beat: 1,
  subBeat: 0,
  numerator: 4,
  denominator: 4,
  isPreStart: true,
};

interface TimelineRange {
  start: number;
  end: number;
  measure: number;
  numerator: number;
  denominator: number;
  path: number[];
  unit: "tick" | "second";
  key: string;
}

interface TimelineSource {
  mode: string;
  midi: IMidiParseResult | null;
  duration: number;
}

interface Layout {
  horizontal: boolean;
  rulerSize: number;
  inset: number;
  gap: number;
  start: number;
  length: number;
  slotLength: number;
  contentStart: number;
  contentEnd: number;
  contentTop: number;
  contentBottom: number;
}

/**
 * Fixed four-way ruler for chord entry.
 *
 * The first level is the current measure. Clicking a block drills into that
 * exact tick range and splits it into four more blocks, up to three levels:
 * 1 → 1.1 → 1.1.1. The timer only repaints the canvas; it never rerenders the
 * React tree at clock cadence.
 */
interface BeatGridProps {
  /** Render the compact two-measure overview used beside the lyrics editor. */
  compact?: boolean;
}

const BeatGrid: React.FC<BeatGridProps> = ({ compact = false }) => {
  const isMobile = useIsMobile();
  const mode = useKaraokeStore((state) => state.mode) ?? "midi";
  const midi = useKaraokeStore((state) => state.playerState.midi);
  const chordsData = useKaraokeStore((state) => state.chordsData);
  const duration = useKaraokeStore((state) => state.playerState.duration) ?? 0;
  const playerControls = usePlayerSetupStore((state) => state.playerControls);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef({ width: 1, height: 1, dpr: 1 });
  const sourceRef = useRef<TimelineSource>({ mode, midi, duration });
  const beatRef = useRef<BeatInfo>(DEFAULT_BEAT);
  const positionRef = useRef(0);
  const rootRef = useRef<TimelineRange>(createRootRange(DEFAULT_BEAT, 0, sourceRef.current));
  const nextRootRef = useRef<TimelineRange>(
    createNextMeasureRange(rootRef.current, DEFAULT_BEAT, sourceRef.current)
  );
  const viewRef = useRef<TimelineRange>(rootRef.current);
  const dirtyRef = useRef(true);
  const frameRef = useRef<number | null>(null);
  const drawRef = useRef<() => void>(() => undefined);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      if (dirtyRef.current) drawRef.current();
    });
  }, []);

  const resetToRoot = useCallback(
    (snapshot: BeatInfo, position: number) => {
      const root = createRootRange(snapshot, position, sourceRef.current);
      rootRef.current = root;
      nextRootRef.current = createNextMeasureRange(
        root,
        snapshot,
        sourceRef.current
      );
      viewRef.current = root;
      beatRef.current = snapshot;
      positionRef.current = position;
      markDirty();
    },
    [markDirty]
  );

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    sizeRef.current = resizeCanvas(canvas);
    markDirty();
  }, [markDirty]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const { width, height, dpr } = sizeRef.current;
    const range = viewRef.current;
    const count = getSubdivisionCount(range);
    const children = splitRange(range, count);
    const layout = getLayout(width, height, isMobile, count);
    const currentPosition = positionRef.current;
    const computed = getComputedStyle(document.documentElement);
    const panel = computed.getPropertyValue("--panel").trim() || "#131a23";
    const panelAlt = computed.getPropertyValue("--panel-2").trim() || "#18212d";
    const line = computed.getPropertyValue("--line").trim() || "#3b4a5d";
    const strongLine =
      computed.getPropertyValue("--line-strong").trim() || "#667991";
    const text =
      computed.getPropertyValue("--foreground").trim() || "#f4f7fb";
    const muted =
      computed.getPropertyValue("--muted-foreground").trim() || "#8795a8";
    const active =
      computed.getPropertyValue("--lyric-playing").trim() || "#f6dc67";
    const chordColor =
      computed.getPropertyValue("--chord").trim() || "#f4bd68";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = panel;
    ctx.fillRect(0, 0, width, height);
    ctx.textBaseline = "middle";

    if (compact) {
      drawCompactMeasureRows(
        ctx,
        width,
        height,
        rootRef.current,
        nextRootRef.current,
        currentPosition,
        panelAlt,
        active,
        muted,
        line,
        chordsData,
        chordColor
      );
      dirtyRef.current = false;
      return;
    }

    drawHeader(ctx, width, height, layout, range, muted, text);
    drawRuler(ctx, layout, range, count, line, strongLine, muted);

    drawBlockRuler(
      ctx,
      layout,
      children,
      currentPosition,
      panelAlt,
      active,
      chordsData,
      chordColor
    );

    dirtyRef.current = false;
  }, [chordsData, compact, isMobile]);

  useEffect(() => {
    drawRef.current = draw;
    markDirty();
  }, [draw, markDirty]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [resize]);

  useEffect(() => {
    sourceRef.current = { mode, midi, duration };
    const timerState = useTimerStore.getState();
    resetToRoot(timerState.beatInfo, timerState.presentationValue);
  }, [duration, midi, mode, resetToRoot]);

  useEffect(() => {
    const update = (snapshot: ReturnType<typeof useTimerStore.getState>) => {
      const nextRoot = createRootRange(
        snapshot.beatInfo,
        snapshot.presentationValue,
        sourceRef.current
      );
      const rootChanged = nextRoot.key !== rootRef.current.key;

      beatRef.current = snapshot.beatInfo;
      positionRef.current = snapshot.presentationValue;
      if (rootChanged) {
        rootRef.current = nextRoot;
        nextRootRef.current = createNextMeasureRange(
          nextRoot,
          snapshot.beatInfo,
          sourceRef.current
        );
        viewRef.current = nextRoot;
      }
      markDirty();
    };

    update(useTimerStore.getState());
    return useTimerStore.subscribe((next, previous) => {
      if (
        next.presentationValue !== previous.presentationValue ||
        next.beatInfo.measure !== previous.beatInfo.measure ||
        next.beatInfo.beat !== previous.beatInfo.beat ||
        next.beatInfo.numerator !== previous.beatInfo.numerator ||
        next.beatInfo.denominator !== previous.beatInfo.denominator
      ) {
        update(next);
      }
    });
  }, [markDirty]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (compact) {
        const { width, height } = sizeRef.current;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const vertical = isCompactVertical(width, height);
        const rowHeight = Math.max(1, height / 2);
        const rowIndex = y < rowHeight ? 0 : 1;
        const currentSlot = getCompactMeasureSlot(rootRef.current.measure);
        const range =
          rowIndex === currentSlot ? rootRef.current : nextRootRef.current;
        const count = getSubdivisionCount(range);
        let index: number;
        if (vertical) {
          const labelHeight = Math.min(22, Math.max(17, rowHeight * 0.18));
          const laneTop = rowIndex * rowHeight + labelHeight;
          const laneHeight = Math.max(1, rowHeight - labelHeight - 4);
          if (x < 6 || x > width - 6 || y < laneTop || y > laneTop + laneHeight) {
            return;
          }
          index = Math.min(
            count - 1,
            Math.max(0, Math.floor(((y - laneTop) / laneHeight) * count))
          );
        } else {
          const laneStart = Math.min(42, Math.max(30, width * 0.2));
          const laneWidth = Math.max(1, width - laneStart - 6);
          if (x < laneStart || x > laneStart + laneWidth) return;
          index = Math.min(
            count - 1,
            Math.max(0, Math.floor(((x - laneStart) / laneWidth) * count))
          );
        }
        const selected = splitRange(range, count)[index];
        if (!selected) return;
        const target = mode === "midi" ? Math.round(selected.start) : selected.start;
        if (range.key !== rootRef.current.key) {
          rootRef.current = range;
          nextRootRef.current = createNextMeasureRange(
            range,
            { ...beatRef.current, measure: range.measure },
            sourceRef.current
          );
        }
        viewRef.current = selected;
        positionRef.current = target;
        markDirty();
        useKaraokeStore.getState().actions.setPlayFromScrolledPosition(true);
        void Promise.resolve(playerControls?.seek(target)).catch((error) => {
          console.error("Unable to select chord beat:", error);
        });
        return;
      }

      const range = viewRef.current;
      const { width, height } = sizeRef.current;
      const layout = getLayout(
        width,
        height,
        isMobile,
        getSubdivisionCount(range)
      );
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (
        range.path.length > 0 &&
        ((layout.horizontal && x < layout.rulerSize && y < layout.rulerSize) ||
          (!layout.horizontal && x < layout.rulerSize && y < layout.rulerSize))
      ) {
        viewRef.current = getRangeAtPath(rootRef.current, range.path.slice(0, -1));
        markDirty();
        return;
      }

      const index = getSlotIndex(layout, x, y, getSubdivisionCount(range));
      if (index === null || range.path.length >= MAX_DEPTH) return;

      const children = splitRange(range, getSubdivisionCount(range));
      const selected = children[index];
      if (!selected) return;
      const target =
        mode === "midi" ? Math.round(selected.start) : selected.start;
      viewRef.current = selected;
      positionRef.current = target;
      markDirty();
      useKaraokeStore.getState().actions.setPlayFromScrolledPosition(true);
      void Promise.resolve(playerControls?.seek(target)).catch((error) => {
        console.error("Unable to select chord beat:", error);
      });
    },
    [compact, isMobile, markDirty, mode, playerControls]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (
        (event.key !== "Escape" && event.key !== "Backspace") ||
        viewRef.current.path.length === 0
      ) {
        return;
      }
      event.preventDefault();
      viewRef.current = getRangeAtPath(
        rootRef.current,
        viewRef.current.path.slice(0, -1)
      );
      markDirty();
    },
    [markDirty]
  );

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-panel ${
        compact ? "" : "rounded-lg border border-line"
      }`}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-pointer"
        style={{ fontFamily: "var(--font-lyrics)" }}
        tabIndex={0}
        aria-label={compact ? "Two-measure chord overview" : "Fixed four-level chord ruler"}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

function createRootRange(
  beat: BeatInfo,
  position: number,
  source: TimelineSource
): TimelineRange {
  const numerator = Math.max(1, Math.round(beat.numerator || SUBDIVISIONS));
  const denominator = Math.max(1, Math.round(beat.denominator || 4));

  if (source.mode === "midi" && source.midi) {
    const midi = source.midi;
    const signatures = midi.timeSignatures.length
      ? midi.timeSignatures
      : [{ tick: 0, numerator, denominator }];
    const currentPosition = Math.max(0, position);
    let signatureIndex = 0;
    for (let index = 1; index < signatures.length; index += 1) {
      if (signatures[index].tick > currentPosition) break;
      signatureIndex = index;
    }

    const signature = signatures[signatureIndex];
    const currentNumerator = Math.max(1, signature.numerator || numerator);
    const currentDenominator = Math.max(1, signature.denominator || denominator);
    const ticksPerBeat = Math.max(1, midi.ticksPerBeat) * (4 / currentDenominator);
    const ticksPerMeasure = Math.max(1, ticksPerBeat * currentNumerator);
    const relativeTick = Math.max(0, currentPosition - signature.tick);
    const start =
      signature.tick + Math.floor(relativeTick / ticksPerMeasure) * ticksPerMeasure;
    const nextSignatureTick = signatures[signatureIndex + 1]?.tick;
    const naturalEnd = start + ticksPerMeasure;
    const endLimit = Math.min(
      nextSignatureTick ?? Number.POSITIVE_INFINITY,
      source.duration > start ? source.duration : Number.POSITIVE_INFINITY
    );
    const end = Math.max(start + 1, Math.min(naturalEnd, endLimit));

    return makeRange(
      start,
      end,
      beat.measure,
      currentNumerator,
      currentDenominator,
      [],
      "tick"
    );
  }

  const total = Math.max(1, source.duration || 0);
  const sectionLength = Math.max(1, Math.min(4, total));
  const start = Math.floor(Math.max(0, position) / sectionLength) * sectionLength;
  const end = Math.max(start + 1, Math.min(total, start + sectionLength));
  return makeRange(start, end, beat.measure, numerator, denominator, [], "second");
}

function createNextMeasureRange(
  range: TimelineRange,
  beat: BeatInfo,
  source: TimelineSource
): TimelineRange {
  const nextBeat: BeatInfo = {
    ...beat,
    measure: range.measure + 1,
    isPreStart: false,
  };
  return createRootRange(nextBeat, range.end, source);
}

function makeRange(
  start: number,
  end: number,
  measure: number,
  numerator: number,
  denominator: number,
  path: number[],
  unit: "tick" | "second"
): TimelineRange {
  return {
    start,
    end,
    measure,
    numerator,
    denominator,
    path,
    unit,
    key: `${unit}:${measure}:${start}:${end}:${numerator}/${denominator}`,
  };
}

function splitRange(range: TimelineRange, count: number): TimelineRange[] {
  const safeCount = Math.max(1, count || SUBDIVISIONS);
  const length = (range.end - range.start) / safeCount;
  return Array.from({ length: safeCount }, (_, index) => {
    const start = range.start + length * index;
    const end = index === safeCount - 1 ? range.end : start + length;
    return makeRange(
      start,
      end,
      range.measure,
      range.numerator,
      range.denominator,
      [...range.path, index + 1],
      range.unit
    );
  });
}

function getRangeAtPath(root: TimelineRange, path: number[]): TimelineRange {
  let current = root;
  for (const item of path) {
    const children = splitRange(current, getSubdivisionCount(current));
    current = children[item - 1] ?? current;
  }
  return current;
}

function formatPath(path: number[]): string {
  return path.length > 0 ? path.join(".") : "1–4";
}

function getSubdivisionCount(range: TimelineRange): number {
  return range.path.length === 0
    ? Math.max(1, Math.round(range.numerator || SUBDIVISIONS))
    : SUBDIVISIONS;
}

function formatRulerValue(value: number, unit: TimelineRange["unit"]): string {
  if (unit === "tick") return String(Math.round(value));
  return `${value.toFixed(value < 10 ? 2 : 1)}s`;
}

function isPositionInRange(
  position: number,
  start: number,
  end: number,
  includeEnd: boolean
): boolean {
  return position >= start && (position < end || (includeEnd && position <= end));
}

function getLayout(
  width: number,
  height: number,
  isMobile: boolean,
  count: number
): Layout {
  const horizontal = isMobile;
  const rulerSize = horizontal ? 28 : 38;
  const inset = horizontal ? 8 : 10;
  // Blocks share an edge so the lane reads as one continuous ruler. The
  // beat marks are still drawn by drawRuler above the lane.
  const gap = 0;
  const contentStart = horizontal ? inset : rulerSize;
  const contentEnd = horizontal ? width - inset : width - inset;
  const contentTop = horizontal ? rulerSize : inset;
  const contentBottom = horizontal ? height - inset : height - inset;
  const length = horizontal
    ? Math.max(1, contentEnd - contentStart)
    : Math.max(1, contentBottom - contentTop);
  const slotLength = Math.max(1, (length - gap * (count - 1)) / count);

  return {
    horizontal,
    rulerSize,
    inset,
    gap,
    start: horizontal ? contentStart : contentTop,
    length,
    slotLength,
    contentStart,
    contentEnd,
    contentTop,
    contentBottom,
  };
}

function getSlotPosition(
  layout: Layout,
  index: number
): { x: number; y: number; width: number; height: number } {
  const offset = layout.start + index * (layout.slotLength + layout.gap);
  if (layout.horizontal) {
    return {
      x: offset,
      y: layout.contentTop,
      width: layout.slotLength,
      height: Math.max(1, layout.contentBottom - layout.contentTop),
    };
  }
  return {
    x: layout.contentStart,
    y: offset,
    width: Math.max(1, layout.contentEnd - layout.contentStart),
    height: layout.slotLength,
  };
}

function drawBlockRuler(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  children: TimelineRange[],
  currentPosition: number,
  panelAlt: string,
  active: string,
  chords: readonly ChordEvent[],
  chordColor: string
): void {
  const laneWidth = Math.max(1, layout.contentEnd - layout.contentStart);
  const laneHeight = Math.max(1, layout.contentBottom - layout.contentTop);

  // One continuous lane: the divisions are ruler marks, not separate cards.
  ctx.fillStyle = panelAlt;
  ctx.globalAlpha = 0.22;
  ctx.fillRect(layout.contentStart, layout.contentTop, laneWidth, laneHeight);
  ctx.globalAlpha = 1;

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    const position = getSlotPosition(layout, index);
    const isActive = isPositionInRange(
      currentPosition,
      child.start,
      child.end,
      index === children.length - 1
    );

    if (isActive) {
      ctx.fillStyle = active;
      ctx.globalAlpha = 0.16;
      ctx.fillRect(position.x, position.y, position.width, position.height);
      ctx.globalAlpha = 1;
    } else if (index % 2 === 0) {
      ctx.fillStyle = panelAlt;
      ctx.globalAlpha = 0.24;
      ctx.fillRect(position.x, position.y, position.width, position.height);
      ctx.globalAlpha = 1;
    }

    // The active position uses a narrow playhead-like stripe, matching the
    // timer indicator without making the block look like a button.
    if (isActive) {
      ctx.fillStyle = active;
      if (layout.horizontal) {
        ctx.fillRect(position.x, position.y, 3, position.height);
      } else {
        ctx.fillRect(position.x, position.y, position.width, 3);
      }
    }

      drawCompactBlockText(
        ctx,
        findChordForRange(chords, child.start, child.end)?.chord,
        position.x,
        position.y,
      position.width,
      position.height,
      panelAlt,
      isActive ? active : chordColor
    );

  }
}

function drawCompactMeasureRows(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  currentRange: TimelineRange,
  nextRange: TimelineRange,
  currentPosition: number,
  panelAlt: string,
  active: string,
  muted: string,
  line: string,
  chords: readonly ChordEvent[],
  chordColor: string
): void {
  if (isCompactVertical(width, height)) {
    drawCompactVerticalMeasureRows(
      ctx,
      width,
      height,
      currentRange,
      nextRange,
      currentPosition,
      panelAlt,
      active,
      muted,
      line,
      chords,
      chordColor
    );
    return;
  }

  const rowHeight = Math.max(1, height / 2);
  const labelWidth = Math.min(42, Math.max(30, width * 0.2));
  const laneStart = labelWidth;
  const laneWidth = Math.max(1, width - laneStart - 6);
  const rows = getCompactMeasureRows(currentRange, nextRange);

  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = "700 10px ui-monospace, SFMono-Regular, Menlo, monospace";

  rows.forEach((range, rowIndex) => {
    const top = rowIndex * rowHeight;
    const count = getSubdivisionCount(range);
    const children = splitRange(range, count);
    const rowActive =
      range.key === currentRange.key &&
      isPositionInRange(currentPosition, range.start, range.end, true);

    if (rowIndex > 0) {
      ctx.strokeStyle = line;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, top);
      ctx.lineTo(width, top);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = rowActive ? active : muted;
    ctx.fillText(`M${range.measure}`, 8, top + rowHeight / 2);

    ctx.fillStyle = panelAlt;
    ctx.globalAlpha = rowActive ? 0.18 : 0.1;
    ctx.fillRect(laneStart, top + 5, laneWidth, Math.max(1, rowHeight - 10));
    ctx.globalAlpha = 1;

    for (let index = 0; index < children.length; index += 1) {
      const child = children[index];
      const x = laneStart + (laneWidth * index) / children.length;
      const nextX = laneStart + (laneWidth * (index + 1)) / children.length;
      const slotWidth = Math.max(1, nextX - x);
      const childActive =
        rowActive &&
        isPositionInRange(
          currentPosition,
          child.start,
          child.end,
          index === children.length - 1
        );

      if (index % 2 === 0 && !childActive) {
        ctx.fillStyle = panelAlt;
        ctx.globalAlpha = 0.14;
        ctx.fillRect(x, top + 5, slotWidth, Math.max(1, rowHeight - 10));
        ctx.globalAlpha = 1;
      }

      if (childActive) {
        ctx.fillStyle = active;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(x, top + 5, slotWidth, Math.max(1, rowHeight - 10));
        ctx.globalAlpha = 1;
        ctx.fillStyle = active;
        ctx.fillRect(x, top + 5, Math.min(3, slotWidth), Math.max(1, rowHeight - 10));
      }

      if (index > 0) {
        ctx.strokeStyle = line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, top + 5);
        ctx.lineTo(x, top + rowHeight - 5);
        ctx.stroke();
      }

      drawCompactBlockText(
        ctx,
        findChordForRange(chords, child.start, child.end)?.chord,
        x,
        top + 5,
        slotWidth,
        Math.max(1, rowHeight - 10),
        panelAlt,
        childActive ? active : chordColor
      );
    }

    ctx.textAlign = "left";
  });
}

function drawCompactVerticalMeasureRows(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  currentRange: TimelineRange,
  nextRange: TimelineRange,
  currentPosition: number,
  panelAlt: string,
  active: string,
  muted: string,
  line: string,
  chords: readonly ChordEvent[],
  chordColor: string
): void {
  const measureHeight = Math.max(1, height / 2);
  const labelHeight = Math.min(22, Math.max(17, measureHeight * 0.18));
  const laneStart = 6;
  const laneWidth = Math.max(1, width - laneStart * 2);
  const rows = getCompactMeasureRows(currentRange, nextRange);

  rows.forEach((range, rowIndex) => {
    const top = rowIndex * measureHeight;
    const count = getSubdivisionCount(range);
    const children = splitRange(range, count);
    const laneTop = top + labelHeight;
    const laneHeight = Math.max(1, measureHeight - labelHeight - 4);
    const rowActive =
      range.key === currentRange.key &&
      isPositionInRange(currentPosition, range.start, range.end, true);

    if (rowIndex > 0) {
      ctx.strokeStyle = line;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, top);
      ctx.lineTo(width, top);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "700 10px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = rowActive ? active : muted;
    ctx.fillText(`M${range.measure}`, laneStart, top + labelHeight / 2);

    ctx.fillStyle = panelAlt;
    ctx.globalAlpha = rowActive ? 0.18 : 0.1;
    ctx.fillRect(laneStart, laneTop, laneWidth, laneHeight);
    ctx.globalAlpha = 1;

    for (let index = 0; index < children.length; index += 1) {
      const child = children[index];
      const y = laneTop + (laneHeight * index) / children.length;
      const nextY = laneTop + (laneHeight * (index + 1)) / children.length;
      const slotHeight = Math.max(1, nextY - y);
      const childActive =
        rowActive &&
        isPositionInRange(
          currentPosition,
          child.start,
          child.end,
          index === children.length - 1
        );

      if (index % 2 === 0 && !childActive) {
        ctx.fillStyle = panelAlt;
        ctx.globalAlpha = 0.14;
        ctx.fillRect(laneStart, y, laneWidth, slotHeight);
        ctx.globalAlpha = 1;
      }

      if (childActive) {
        ctx.fillStyle = active;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(laneStart, y, laneWidth, slotHeight);
        ctx.globalAlpha = 1;
        ctx.fillStyle = active;
        ctx.fillRect(laneStart, y, laneWidth, Math.min(3, slotHeight));
      }

      if (index > 0) {
        ctx.strokeStyle = line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(laneStart, y);
        ctx.lineTo(laneStart + laneWidth, y);
        ctx.stroke();
      }

      drawCompactBlockText(
        ctx,
        findChordForRange(chords, child.start, child.end)?.chord,
        laneStart,
        y,
        laneWidth,
        slotHeight,
        panelAlt,
        childActive ? active : chordColor
      );
    }
  });
}

function isCompactVertical(width: number, height: number): boolean {
  // Chord blocks use one stable vertical reading direction. The surrounding
  // editor may change orientation, but the chord lane itself should not jump
  // between horizontal and vertical layouts.
  void width;
  void height;
  return true;
}

function getCompactMeasureRows(
  currentRange: TimelineRange,
  nextRange: TimelineRange
): TimelineRange[] {
  const rows = [currentRange, nextRange];
  const currentSlot = getCompactMeasureSlot(currentRange.measure);
  rows[currentSlot] = currentRange;
  rows[currentSlot === 0 ? 1 : 0] = nextRange;
  return rows;
}

function getCompactMeasureSlot(measure: number): 0 | 1 {
  const normalizedMeasure = Math.max(1, Math.trunc(measure || 1));
  return normalizedMeasure % 2 === 1 ? 0 : 1;
}

function drawCompactBlockText(
  ctx: CanvasRenderingContext2D,
  chord: string | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
  background: string,
  accent: string
): void {
  const label = chord?.trim();
  if (!label || width < 12 || height < 14) return;

  ctx.font = "700 11px sans-serif";
  const cardHeight = Math.min(24, Math.max(16, height - 4));
  const maxCardWidth = Math.max(1, width - 6);
  const cardWidth = Math.min(
    maxCardWidth,
    Math.max(18, ctx.measureText(label).width + 12)
  );
  const cardX = x + (width - cardWidth) / 2;
  const cardY = y + (height - cardHeight) / 2;

  ctx.fillStyle = background;
  ctx.globalAlpha = 0.96;
  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 5);
  ctx.fill();
  ctx.globalAlpha = 0.42;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(cardX, cardY, 3, cardHeight);
  ctx.globalAlpha = 1;
  ctx.font = "700 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = accent;
  ctx.fillText(
    fitCanvasText(ctx, label, Math.max(1, width - 8)),
    x + width / 2,
    y + height / 2 + 4
  );
}

function fitCanvasText(
  ctx: CanvasRenderingContext2D,
  value: string,
  maxWidth: number
): string {
  if (ctx.measureText(value).width <= maxWidth) return value;
  let result = value;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

function getSlotIndex(
  layout: Layout,
  x: number,
  y: number,
  count: number
): number | null {
  const axis = layout.horizontal ? x : y;
  const crossAxis = layout.horizontal ? y : x;
  if (
    crossAxis < (layout.horizontal ? layout.contentTop : layout.contentStart) ||
    crossAxis > (layout.horizontal ? layout.contentBottom : layout.contentEnd)
  ) {
    return null;
  }

  const relative = axis - layout.start;
  const step = layout.slotLength + layout.gap;
  const index = Math.floor(relative / step);
  if (index < 0 || index >= count) return null;
  const slotStart = layout.start + index * step;
  if (axis > slotStart + layout.slotLength) return null;
  return index;
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layout: Layout,
  range: TimelineRange,
  muted: string,
  text: string
): void {
  ctx.fillStyle = muted;
  ctx.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "left";
  const title = `M${range.measure}  ${range.path.length ? formatPath(range.path) : `${range.numerator} beat`}`;
  if (layout.horizontal) {
    ctx.fillText(title, layout.inset, layout.rulerSize / 2);
  } else {
    ctx.fillText(title, layout.rulerSize + 6, layout.inset / 2 + 1);
  }

  if (range.path.length > 0) {
    ctx.fillStyle = text;
    ctx.font = "700 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("‹", layout.rulerSize / 2, layout.rulerSize / 2);
  }
}

function drawRuler(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  range: TimelineRange,
  count: number,
  line: string,
  strongLine: string,
  muted: string
): void {
  ctx.fillStyle = "rgba(127, 145, 168, 0.08)";
  if (layout.horizontal) {
    ctx.fillRect(0, 0, layout.contentEnd + layout.inset, layout.rulerSize);
  } else {
    ctx.fillRect(0, 0, layout.rulerSize, layout.contentBottom + layout.inset);
  }

  ctx.font = "600 8px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textBaseline = "middle";
  for (let index = 0; index <= count; index += 1) {
    const position =
      index === 0
        ? layout.start
        : index === count
        ? layout.start + layout.length
        : layout.start + index * (layout.slotLength + layout.gap) - layout.gap / 2;
    const value = range.start + ((range.end - range.start) * index) / count;
    const isEdge = index === 0 || index === count;
    ctx.strokeStyle = isEdge ? strongLine : line;
    ctx.lineWidth = isEdge ? 1.5 : 1;
    ctx.beginPath();
    if (layout.horizontal) {
      ctx.moveTo(position, layout.rulerSize - 1);
      ctx.lineTo(position, isEdge ? layout.rulerSize - 9 : layout.rulerSize - 13);
    } else {
      ctx.moveTo(layout.rulerSize - 1, position);
      ctx.lineTo(isEdge ? layout.rulerSize - 9 : layout.rulerSize - 13, position);
    }
    ctx.stroke();

    ctx.fillStyle = muted;
    ctx.textAlign = layout.horizontal ? "center" : "right";
    if (layout.horizontal) {
      ctx.fillText(formatRulerValue(value, range.unit), position, 9);
    } else {
      ctx.fillText(formatRulerValue(value, range.unit), layout.rulerSize - 10, position);
    }
  }
}

export default BeatGrid;
