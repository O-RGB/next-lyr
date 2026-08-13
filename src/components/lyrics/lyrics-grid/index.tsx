"use client";

import React, { useCallback, useEffect, useRef } from "react";

import { resizeCanvas, roundedRect, clamp } from "@/lib/canvas/runtime";
import type { LyricWordData } from "@/types/common.type";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import LineAction from "./line/actions";

const ROW_HEIGHT = 60;
const LEFT_GUTTER = 36;
const RIGHT_GUTTER = 34;
const WORD_GAP = 6;
const WORD_HEIGHT = 34;

interface WordHitBox {
  index: number;
  lineIndex: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Canvas lyrics editor viewport.
 *
 * The scroll spacer keeps native scrolling and accessibility-friendly line
 * actions, while the visible lyrics, timing colors and active word are painted
 * in one viewport canvas. The hot playback clock never enters React render.
 */
const LyricsGrid: React.FC = () => {
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const onWordClick = usePlayerHandlersStore((state) => state.handleWordClick);
  const actions = useKaraokeStore((state) => state.actions);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const linesRef = useRef(lyricsData);
  const hitBoxesRef = useRef<WordHitBox[]>([]);
  const sizeRef = useRef({ width: 1, height: 1, dpr: 1 });
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

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const scroll = scrollRef.current;
    if (!canvas || !scroll) return;
    // The canvas is sticky inside a long scroll spacer. Keep its CSS height
    // equal to the actual viewport, otherwise h-full would make it as tall
    // as the entire lyrics document.
    canvas.style.height = `${Math.max(1, scroll.clientHeight)}px`;
    canvas.style.width = `${Math.max(1, scroll.clientWidth)}px`;
    sizeRef.current = resizeCanvas(canvas);
    markDirty();
  }, [markDirty]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const scroll = scrollRef.current;
    if (!canvas || !scroll) return;

    const size = sizeRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = useKaraokeStore.getState();
    const lines = linesRef.current;
    const scrollTop = scroll.scrollTop;
    const firstLine = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 1);
    const lastLine = Math.min(
      lines.length,
      Math.ceil((scrollTop + size.height) / ROW_HEIGHT) + 1
    );
    const isDark = document.documentElement.classList.contains("dark");
    const fontFamily = getComputedStyle(canvas).fontFamily || "sans-serif";
    const monoFamily = "ui-monospace, SFMono-Regular, Menlo, monospace";
    const colors = isDark
      ? {
          base: "#131a23",
          alt: "#18212d",
          border: "#3b4a5d",
          text: "#f4f7fb",
          muted: "#8795a8",
          box: "#18212d",
          boxBorder: "#3b4a5d",
          selected: "rgba(120,170,255,0.12)",
          active: "#78aaff",
          timed: "#49d17d",
          playing: "#f6dc67",
          pending: "#ff9f43",
        }
      : {
          base: "#f2f5f9",
          alt: "#eaf0f7",
          border: "#c9d2df",
          text: "#1c2430",
          muted: "#7b8796",
          box: "#ffffff",
          boxBorder: "#c9d2df",
          selected: "rgba(40,120,232,0.10)",
          active: "#2878e8",
          timed: "#1caa58",
          playing: "#f0d14b",
          pending: "#e78225",
        };

    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.font = `600 14px ${fontFamily}`;
    ctx.textBaseline = "middle";
    hitBoxesRef.current = [];

    for (let lineIndex = firstLine; lineIndex < lastLine; lineIndex += 1) {
      const line = lines[lineIndex] ?? [];
      const y = lineIndex * ROW_HEIGHT - scrollTop;
      const selected = state.selectedLineIndex === lineIndex;
      const isTimingLine =
        state.isTimingActive && state.timingBuffer?.lineIndex === lineIndex;

      ctx.fillStyle = lineIndex % 2 === 0 ? colors.base : colors.alt;
      ctx.fillRect(0, y, size.width, ROW_HEIGHT);
      if (selected || isTimingLine) {
        ctx.fillStyle = colors.selected;
        ctx.fillRect(0, y, size.width, ROW_HEIGHT);
      }
      ctx.fillStyle = colors.border;
      ctx.fillRect(0, y + ROW_HEIGHT - 1, size.width, 1);

      ctx.fillStyle = colors.muted;
      ctx.font = `600 10px ${monoFamily}`;
      ctx.textAlign = "center";
      ctx.fillText(String(lineIndex + 1), LEFT_GUTTER / 2, y + ROW_HEIGHT / 2);

      const availableWidth = Math.max(
        1,
        size.width - LEFT_GUTTER - RIGHT_GUTTER - 16
      );
      ctx.font = `600 14px ${fontFamily}`;
      const wordWidths = measureWords(ctx, line, availableWidth);
      const totalWidth = wordWidths.reduce(
        (sum, width) => sum + width,
        0
      ) + Math.max(0, line.length - 1) * WORD_GAP;
      const scale = Math.min(1, availableWidth / Math.max(1, totalWidth));
      const startX = LEFT_GUTTER + 8;
      let x = startX;

      ctx.textAlign = "center";
      line.forEach((word, wordIndex) => {
        ctx.font = `600 14px ${fontFamily}`;
        const boxWidth = wordWidths[wordIndex] * scale;
        const boxY = y + (ROW_HEIGHT - WORD_HEIGHT) / 2;
        const boxX = x;
        const isPlaying = state.playbackIndex === word.index;
        const isActive =
          state.currentIndex === word.index &&
          (state.isTimingActive || state.correctionIndex !== null);
        const isCorrection = state.correctionIndex === word.index;
        const bufferEntry = state.timingBuffer?.buffer.get(word.index);
        const isTimed =
          word.start !== null ||
          (bufferEntry !== undefined && word.index < state.currentIndex);

        ctx.fillStyle = isPlaying ? colors.playing : colors.box;
        roundedRect(ctx, boxX, boxY, boxWidth, WORD_HEIGHT, 5);
        ctx.fill();
        ctx.strokeStyle = isActive
          ? colors.active
          : isCorrection
          ? colors.pending
          : colors.boxBorder;
        ctx.lineWidth = isActive || isCorrection ? 2 : 1;
        ctx.stroke();

        if (isTimed) {
          ctx.fillStyle = colors.timed;
          ctx.fillRect(boxX, boxY, 3, WORD_HEIGHT);
        }
        if (isCorrection) {
          ctx.fillStyle = colors.pending;
          ctx.fillRect(boxX, boxY, 3, WORD_HEIGHT);
        }

        ctx.save();
        roundedRect(ctx, boxX, boxY, boxWidth, WORD_HEIGHT, 5);
        ctx.clip();
        ctx.fillStyle = colors.text;
        ctx.fillText(word.text, boxX + boxWidth / 2, boxY + WORD_HEIGHT / 2);
        if (word.vocal) {
          ctx.font = `500 8px ${fontFamily}`;
          ctx.fillStyle = colors.muted;
          ctx.fillText(word.vocal, boxX + boxWidth / 2, boxY + WORD_HEIGHT - 6);
        }
        ctx.restore();

        hitBoxesRef.current.push({
          index: word.index,
          lineIndex,
          left: boxX,
          top: boxY,
          right: boxX + boxWidth,
          bottom: boxY + WORD_HEIGHT,
        });
        x += boxWidth + WORD_GAP;
      });

      ctx.fillStyle = colors.muted;
      ctx.font = `700 18px ${fontFamily}`;
      ctx.fillText("⋮", size.width - RIGHT_GUTTER / 2, y + ROW_HEIGHT / 2);
    }

    dirtyRef.current = false;
  }, []);

  useEffect(() => {
    drawRef.current = draw;
    markDirty();
  }, [draw, markDirty]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const scroll = scrollRef.current;
    if (!canvas || !scroll) return;
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(scroll);
    const handleScroll = () => markDirty();
    scroll.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      observer.disconnect();
      scroll.removeEventListener("scroll", handleScroll);
    };
  }, [markDirty, resize]);

  useEffect(() => {
    linesRef.current = lyricsData;
    markDirty();
  }, [lyricsData, markDirty]);

  useEffect(() => {
    const scrollToSelectedLine = (selectedLineIndex: number | null) => {
      if (selectedLineIndex === null || !scrollRef.current) return;
      const target = selectedLineIndex * ROW_HEIGHT;
      const scroll = scrollRef.current;
      if (
        target < scroll.scrollTop ||
        target + ROW_HEIGHT > scroll.scrollTop + scroll.clientHeight
      ) {
        scroll.scrollTo({
          top: Math.max(
            0,
            target - scroll.clientHeight / 2 + ROW_HEIGHT / 2
          ),
          behavior: "smooth",
        });
      }
      markDirty();
    };

    scrollToSelectedLine(useKaraokeStore.getState().selectedLineIndex);
    return useKaraokeStore.subscribe((next, previous) => {
      if (next.selectedLineIndex !== previous.selectedLineIndex) {
        scrollToSelectedLine(next.selectedLineIndex);
      }
      if (
        next.playbackIndex !== previous.playbackIndex ||
        next.currentIndex !== previous.currentIndex ||
        next.isTimingActive !== previous.isTimingActive ||
        next.timingBuffer !== previous.timingBuffer ||
        next.correctionIndex !== previous.correctionIndex ||
        next.editingLineIndex !== previous.editingLineIndex
      ) {
        markDirty();
      }
    });
  }, [markDirty]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, []);

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const scroll = scrollRef.current;
      if (!canvas || !scroll) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hit = [...hitBoxesRef.current].reverse().find(
        (box) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom
      );
      if (hit) {
        void onWordClick(hit.index);
        return;
      }

      const lineIndex = clamp(
        Math.floor((y + scroll.scrollTop) / ROW_HEIGHT),
        0,
        Math.max(0, linesRef.current.length - 1)
      );
      if (x >= rect.width - RIGHT_GUTTER) {
        actions.selectLine(lineIndex);
        actions.openEditModal();
      } else {
        actions.selectLine(lineIndex);
      }
    },
    [actions, onWordClick]
  );

  return (
    <div
      ref={scrollRef}
      className="relative h-full rounded-md border border-line bg-panel overflow-auto [&::-webkit-scrollbar]:hidden"
    >
      <div style={{ height: Math.max(1, lyricsData.length * ROW_HEIGHT), position: "relative" }}>
        <canvas
          ref={canvasRef}
          className="sticky top-0 z-10 block w-full cursor-pointer"
          style={{ fontFamily: "var(--font-lyrics)" }}
          onPointerUp={handlePointerUp}
          aria-label="Lyrics editor canvas"
        />
        <div className="pointer-events-none absolute inset-0 z-20">
          {lyricsData.map((_, lineIndex) => (
            <div
              key={`line-action-${lineIndex}`}
              className="pointer-events-auto absolute right-1"
              style={{ top: lineIndex * ROW_HEIGHT + 15 }}
            >
              <LineAction lineIndex={lineIndex} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function measureWords(
  ctx: CanvasRenderingContext2D,
  line: LyricWordData[],
  availableWidth: number
): number[] {
  const widths = line.map((word) => Math.max(44, ctx.measureText(word.text).width + 20));
  const total = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, line.length - 1) * WORD_GAP;
  if (total <= availableWidth) return widths;
  const factor = availableWidth / total;
  return widths.map((width) => Math.max(30, width * factor));
}

export default React.memo(LyricsGrid);
