"use client";

import React, { useCallback, useEffect, useRef } from "react";

import { resizeCanvas, roundedRect, clamp } from "@/lib/canvas/runtime";
import type { LyricWordData } from "@/types/common.type";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import { useSettingsStore } from "@/features/settings/settings-store";
import LineAction from "./line/actions";

// Keep the editor boxes readable without making each lyric row oversized.
const ROW_HEIGHT = 70;
const LEFT_GUTTER = 36;
const RIGHT_GUTTER = 34;
const WORD_GAP = 7;
const WORD_HEIGHT = 40;
const WORD_FONT_SIZE = 15;
const VOCAL_FONT_SIZE = 8;
const HORIZONTAL_RESET_DURATION_MS = 220;
const HORIZONTAL_OFFSET_EPSILON = 0.5;

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
  const hideLineActions = useKaraokeStore(
    (state) =>
      state.isPlaying ||
      state.isTimingActive ||
      state.editingLineIndex !== null
  );
  const autoScroll = useSettingsStore((state) => state.autoScroll);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const linesRef = useRef(lyricsData);
  const hitBoxesRef = useRef<WordHitBox[]>([]);
  const lineScrollRef = useRef(new Map<number, number>());
  const manualScrollLinesRef = useRef(new Set<number>());
  const horizontalResetAnimationsRef = useRef(
    new Map<number, { from: number; startedAt: number }>()
  );
  const horizontalResetFrameRef = useRef<number | null>(null);
  const reviewCenterLineRef = useRef<number | null>(null);
  const dragRef = useRef<{
    lineIndex: number;
    startX: number;
    startOffset: number;
    moved: boolean;
  } | null>(null);
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

  const runHorizontalResetAnimation = useCallback(() => {
    if (horizontalResetFrameRef.current !== null) return;

    const step = (now: number) => {
      horizontalResetFrameRef.current = null;
      const animations = horizontalResetAnimationsRef.current;
      if (animations.size === 0) return;

      for (const [lineIndex, animation] of animations) {
        const progress = Math.min(
          1,
          (now - animation.startedAt) / HORIZONTAL_RESET_DURATION_MS
        );
        const eased = 1 - Math.pow(1 - progress, 3);
        const offset = animation.from * (1 - eased);

        if (progress >= 1 || offset <= HORIZONTAL_OFFSET_EPSILON) {
          animations.delete(lineIndex);
          lineScrollRef.current.delete(lineIndex);
        } else {
          lineScrollRef.current.set(lineIndex, offset);
        }
      }

      markDirty();
      if (animations.size > 0) {
        horizontalResetFrameRef.current = requestAnimationFrame(step);
      }
    };

    horizontalResetFrameRef.current = requestAnimationFrame(step);
  }, [markDirty]);

  const resetLineScroll = useCallback(
    (lineIndex: number) => {
      const currentOffset = lineScrollRef.current.get(lineIndex) ?? 0;
      manualScrollLinesRef.current.delete(lineIndex);

      if (currentOffset <= HORIZONTAL_OFFSET_EPSILON) {
        horizontalResetAnimationsRef.current.delete(lineIndex);
        lineScrollRef.current.delete(lineIndex);
        return;
      }

      // A reset already owns this line. Restarting its clock on every
      // vertical scroll event is what makes a line wobble near the left edge.
      if (horizontalResetAnimationsRef.current.has(lineIndex)) return;

      horizontalResetAnimationsRef.current.set(lineIndex, {
        from: currentOffset,
        startedAt: performance.now(),
      });
      runHorizontalResetAnimation();
    },
    [runHorizontalResetAnimation]
  );

  const getReviewCenterLine = useCallback(() => {
    const scroll = scrollRef.current;
    if (!scroll || linesRef.current.length === 0) return null;

    return clamp(
      Math.floor(
        (scroll.scrollTop + scroll.clientHeight / 2) / ROW_HEIGHT
      ),
      0,
      Math.max(0, linesRef.current.length - 1)
    );
  }, []);

  const resetHiddenLineScrolls = useCallback(() => {
    const currentLine = getReviewCenterLine();
    if (currentLine === null) return;
    if (reviewCenterLineRef.current === currentLine) return;
    reviewCenterLineRef.current = currentLine;

    const firstReviewLine = Math.max(0, currentLine - 1);
    const lastReviewLine = Math.min(
      linesRef.current.length - 1,
      currentLine + 1
    );

    for (const lineIndex of lineScrollRef.current.keys()) {
      if (lineIndex < firstReviewLine || lineIndex > lastReviewLine) {
        resetLineScroll(lineIndex);
      }
    }
  }, [getReviewCenterLine, resetLineScroll]);

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
          disabledBox: "#10161f",
          disabledBoxBorder: "#263241",
          disabledText: "#667386",
          disabledMuted: "#4b5563",
          selected: "rgba(120,170,255,0.12)",
          active: "#78aaff",
          warn: "#f4bd68",
          warnSoft: "rgba(244,189,104,0.16)",
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
          disabledBox: "#e5e7eb",
          disabledBoxBorder: "#cbd5e1",
          disabledText: "#9ca3af",
          disabledMuted: "#9ca3af",
          selected: "rgba(40,120,232,0.10)",
          active: "#2878e8",
          warn: "#b36b00",
          warnSoft: "rgba(179,107,0,0.12)",
          timed: "#1caa58",
          playing: "#f0d14b",
          pending: "#e78225",
        };

    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.font = `600 14px ${fontFamily}`;
    ctx.textBaseline = "middle";
    hitBoxesRef.current = [];
    const focusLineIndex =
      state.isPlaying || state.isTimingActive || state.editingLineIndex !== null
        ? state.selectedLineIndex ?? -1
        : -1;
    const currentTimingEntry =
      state.isTimingActive && state.timingBuffer
        ? state.timingBuffer.buffer.get(state.currentIndex)
        : undefined;
    // During stamping, currentIndex normally points to the next box because
    // the arrow that records a word also advances the cursor. The warn frame
    // is feedback for the word just stamped, so keep it on the green marker.
    const retimingTargetIndex =
      state.editingLineIndex !== null && state.isTimingActive
        ? currentTimingEntry && currentTimingEntry.at !== null
          ? state.currentIndex
          : state.currentIndex - 1
        : -1;

    for (let lineIndex = firstLine; lineIndex < lastLine; lineIndex += 1) {
      const line = lines[lineIndex] ?? [];
      const y = lineIndex * ROW_HEIGHT - scrollTop;
      const isPassedLine =
        focusLineIndex >= 0 && lineIndex < focusLineIndex;
      const isRetimingMode = state.editingLineIndex !== null;
      const isRetimingLine = state.editingLineIndex === lineIndex;
      // Keep the preceding line live during the retiming pre-roll. Its
      // playback word must still receive the normal yellow highlight and its
      // existing green timing stamps must remain visible while the next line
      // is held as the orange target.
      const isPreparationLine =
        isRetimingMode && lineIndex === state.editingLineIndex! - 1;
      const isDisabledLine = isRetimingMode
        ? !isRetimingLine && !isPreparationLine
        : isPassedLine;
      const selected = state.selectedLineIndex === lineIndex;
      const isTimingLine =
        state.isTimingActive && state.timingBuffer?.lineIndex === lineIndex;

      ctx.fillStyle = lineIndex % 2 === 0 ? colors.base : colors.alt;
      ctx.fillRect(0, y, size.width, ROW_HEIGHT);
      if (isRetimingLine) {
        ctx.fillStyle = colors.warnSoft;
        ctx.fillRect(0, y, size.width, ROW_HEIGHT);
      } else if (selected || isTimingLine) {
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
      ctx.font = `600 ${WORD_FONT_SIZE}px ${fontFamily}`;
      const wordWidths = measureWords(ctx, line);
      const totalWidth =
        wordWidths.reduce((sum, width) => sum + width, 0) +
        Math.max(0, line.length - 1) * WORD_GAP;
      const startX = LEFT_GUTTER + 8;
      const maxLineScroll = Math.max(0, totalWidth - availableWidth);
      const lineScrollLeft = clamp(
        lineScrollRef.current.get(lineIndex) ?? 0,
        0,
        maxLineScroll
      );
      let x = startX - lineScrollLeft;

      ctx.save();
      ctx.beginPath();
      ctx.rect(startX, y, availableWidth, ROW_HEIGHT);
      ctx.clip();
      ctx.textAlign = "center";
      line.forEach((word, wordIndex) => {
        ctx.font = `600 ${WORD_FONT_SIZE}px ${fontFamily}`;
        // Keep the measured width. Overflow is clipped and scrolled within
        // this line's own word area.
        const boxWidth = wordWidths[wordIndex];
        const boxY = y + (ROW_HEIGHT - WORD_HEIGHT) / 2;
        const boxX = x;
        const isPlaybackActive = state.playbackIndex === word.index;
        const isPlaybackPending =
          isPlaybackActive &&
          (!state.isPlaying ||
            state.playbackVisualOverride?.index === word.index);
        const isPlaybackReady =
          isPlaybackActive &&
          state.isPlaying &&
          state.playbackVisualOverride?.index !== word.index;
        const isActive =
          state.editingLineIndex === null &&
          state.currentIndex === word.index &&
          (state.isTimingActive || state.correctionIndex !== null);
        const isRetimingTarget =
          state.editingLineIndex === lineIndex &&
          retimingTargetIndex === word.index;
        const isCorrection = state.correctionIndex === word.index;
        const bufferEntry = state.timingBuffer?.buffer.get(word.index);
        const isTimed =
          word.at !== null ||
          (bufferEntry?.at !== null &&
            bufferEntry !== undefined &&
            word.index < state.currentIndex);

        ctx.fillStyle = isDisabledLine
          ? colors.disabledBox
          : isRetimingTarget
          ? colors.warnSoft
          : isPlaybackPending
          ? colors.selected
          : isPlaybackReady
          ? colors.playing
          : colors.box;
        roundedRect(ctx, boxX, boxY, boxWidth, WORD_HEIGHT, 5);
        ctx.fill();

        // Draw timing markers before the selection outline. The warn outline
        // must remain the top layer when it shares the box with the green
        // marker for the latest stamped word.
        if (isTimed) {
          ctx.fillStyle = isDisabledLine
            ? colors.disabledMuted
            : colors.timed;
          ctx.fillRect(boxX, boxY, 3, WORD_HEIGHT);
        }
        if (isCorrection && !isDisabledLine) {
          ctx.fillStyle = colors.pending;
          ctx.fillRect(boxX, boxY, 3, WORD_HEIGHT);
        }

        ctx.strokeStyle = isDisabledLine
          ? colors.disabledBoxBorder
          : isRetimingTarget
          ? colors.warn
          : isPlaybackPending
          ? colors.active
          : isActive
          ? colors.active
          : isCorrection
          ? colors.pending
          : colors.boxBorder;
        ctx.lineWidth = isRetimingTarget || isActive || isCorrection ? 2 : 1;
        ctx.stroke();

        ctx.save();
        roundedRect(ctx, boxX, boxY, boxWidth, WORD_HEIGHT, 5);
        ctx.clip();
        ctx.fillStyle = isDisabledLine ? colors.disabledText : colors.text;
        ctx.fillText(word.text, boxX + boxWidth / 2, boxY + WORD_HEIGHT / 2);
        if (word.vocal) {
          ctx.font = `500 ${VOCAL_FONT_SIZE}px ${fontFamily}`;
          ctx.fillStyle = isDisabledLine ? colors.disabledMuted : colors.muted;
          ctx.fillText(word.vocal, boxX + boxWidth / 2, boxY + WORD_HEIGHT - 6);
        }
        ctx.restore();

        if (boxX < startX + availableWidth && boxX + boxWidth > startX) {
          hitBoxesRef.current.push({
            index: word.index,
            lineIndex,
            left: Math.max(boxX, startX),
            top: boxY,
            right: Math.min(boxX + boxWidth, startX + availableWidth),
            bottom: boxY + WORD_HEIGHT,
          });
        }
        x += boxWidth + WORD_GAP;
      });
      ctx.restore();

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
    const handleScroll = () => {
      resetHiddenLineScrolls();
      markDirty();
    };
    scroll.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      observer.disconnect();
      scroll.removeEventListener("scroll", handleScroll);
    };
  }, [markDirty, resetHiddenLineScrolls, resize]);

  useEffect(() => {
    linesRef.current = lyricsData;
    resize();
    markDirty();
  }, [lyricsData, markDirty, resize]);

  const syncActiveLineScroll = useCallback(
    (state: ReturnType<typeof useKaraokeStore.getState>) => {
      if (!autoScroll) return;
      const canvas = canvasRef.current;
      const scroll = scrollRef.current;
      const isRetimingPreparation =
        state.editingLineIndex !== null &&
        !state.isTimingActive &&
        state.currentIndex === -1;
      const focusWordIndex = isRetimingPreparation
        ? state.playbackIndex
        : state.isTimingActive || state.editingLineIndex !== null
          ? state.currentIndex
          : state.playbackIndex;
      const preparationWord =
        isRetimingPreparation && focusWordIndex !== null
          ? linesRef.current
              .flat()
              .find((word) => word.index === focusWordIndex)
          : undefined;
      const lineIndex = isRetimingPreparation
        ? preparationWord?.lineIndex ?? null
        : state.selectedLineIndex;
      if (
        !canvas ||
        !scroll ||
        lineIndex === null ||
        focusWordIndex === null ||
        focusWordIndex === -1
      ) {
        return;
      }

      const line = linesRef.current[lineIndex] ?? [];
      if (!line.some((word) => word.index === focusWordIndex)) return;

      const reviewCenterLine = getReviewCenterLine();
      if (
        reviewCenterLine === null ||
        Math.abs(lineIndex - reviewCenterLine) > 1
      ) {
        // The selected/playback line may remain unchanged while the user
        // browses elsewhere. Do not push that hidden line back to the right
        // after the range logic has reset it.
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const fontFamily = getComputedStyle(canvas).fontFamily || "sans-serif";
      ctx.font = `600 ${WORD_FONT_SIZE}px ${fontFamily}`;
      const wordWidths = measureWords(ctx, line);
      const totalWidth =
        wordWidths.reduce((sum, width) => sum + width, 0) +
        Math.max(0, line.length - 1) * WORD_GAP;
      const availableWidth = Math.max(
        1,
        scroll.clientWidth - LEFT_GUTTER - RIGHT_GUTTER - 16
      );
      const lineOffset = getLineScrollLeft(
        line,
        wordWidths,
        totalWidth,
        availableWidth,
        state,
        lineIndex,
        true,
        focusWordIndex,
        isRetimingPreparation
      );
      if (
        manualScrollLinesRef.current.has(lineIndex) ||
        horizontalResetAnimationsRef.current.has(lineIndex)
      ) {
        if (isRetimingPreparation) {
          // The preparation line belongs to playback now, so let its active
          // box take ownership of the horizontal scroll again.
          manualScrollLinesRef.current.delete(lineIndex);
          horizontalResetAnimationsRef.current.delete(lineIndex);
        } else {
          return;
        }
      }
      const currentOffset = lineScrollRef.current.get(lineIndex) ?? 0;
      if (Math.abs(currentOffset - lineOffset) > 0.5) {
        if (lineOffset === 0) {
          lineScrollRef.current.delete(lineIndex);
        } else {
          lineScrollRef.current.set(lineIndex, lineOffset);
        }
        markDirty();
      }
    },
    [autoScroll, getReviewCenterLine, markDirty]
  );

  useEffect(() => {
    const scrollToSelectedLine = (
      selectedLineIndex: number | null,
      forceCenter = false
    ) => {
      if (!autoScroll || selectedLineIndex === null || !scrollRef.current) {
        markDirty();
        return;
      }
      const target = selectedLineIndex * ROW_HEIGHT;
      const scroll = scrollRef.current;
      const centeredTop = Math.max(
        0,
        Math.min(
          Math.max(0, scroll.scrollHeight - scroll.clientHeight),
          target - scroll.clientHeight / 2 + ROW_HEIGHT / 2
        )
      );
      const isCentered = Math.abs(scroll.scrollTop - centeredTop) <= 2;
      if (forceCenter || !isCentered) {
        scroll.scrollTo({
          top: centeredTop,
          behavior: "smooth",
        });
      }
      markDirty();
    };

    const initialState = useKaraokeStore.getState();
    scrollToSelectedLine(initialState.selectedLineIndex);
    syncActiveLineScroll(initialState);
    return useKaraokeStore.subscribe((next, previous) => {
      if (next.selectedLineIndex !== previous.selectedLineIndex) {
        // A line's horizontal scroll is only useful while that line is
        // active. Reset the line we just left so returning to it never opens
        // at a stale right-side box.
        if (previous.selectedLineIndex !== null) {
          resetLineScroll(previous.selectedLineIndex);
        }
        // A line transition is the vertical follow trigger. Put the new line
        // on the viewport centre even when the old line was still visible.
        scrollToSelectedLine(next.selectedLineIndex, true);
        syncActiveLineScroll(next);
      }
      if (
        next.editingLineIndex !== previous.editingLineIndex &&
        next.editingLineIndex !== null
      ) {
        // Retiming always starts from the first box of the target line. Do
        // not carry over a horizontal offset left by normal playback/editing.
        resetLineScroll(next.editingLineIndex);
        markDirty();
      }
      const playbackStopped =
        next.isPlaying !== previous.isPlaying && !next.isPlaying;
      if (playbackStopped) {
        const lineIndex =
          next.selectedLineIndex ?? previous.selectedLineIndex;
        if (lineIndex !== null) {
          // A stopped/paused line always reopens from its first box on the
          // next Space press, so never leave its horizontal scroll at the
          // last auto-followed word.
          resetLineScroll(lineIndex);
        }
        markDirty();
      }
      if (
        next.playbackIndex !== previous.playbackIndex ||
        next.currentIndex !== previous.currentIndex ||
        next.isTimingActive !== previous.isTimingActive ||
        next.timingBuffer !== previous.timingBuffer ||
        next.correctionIndex !== previous.correctionIndex ||
        next.editingLineIndex !== previous.editingLineIndex
      ) {
        if (!playbackStopped) syncActiveLineScroll(next);
        markDirty();
      }
    });
  }, [autoScroll, markDirty, resetLineScroll, syncActiveLineScroll]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (horizontalResetFrameRef.current !== null) {
        cancelAnimationFrame(horizontalResetFrameRef.current);
        horizontalResetFrameRef.current = null;
      }
      horizontalResetAnimationsRef.current.clear();
    };
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const scroll = scrollRef.current;
      if (!canvas || !scroll) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const lineIndex = clamp(
        Math.floor((y + scroll.scrollTop) / ROW_HEIGHT),
        0,
        Math.max(0, linesRef.current.length - 1)
      );
      const availableWidth = Math.max(
        1,
        canvas.clientWidth - LEFT_GUTTER - RIGHT_GUTTER - 16
      );
      const startX = LEFT_GUTTER + 8;
      if (x < startX || x > startX + availableWidth) return;

      const line = linesRef.current[lineIndex] ?? [];
      const metrics = getLineMetrics(canvas, line, availableWidth);
      if (metrics.maxScroll <= 0) return;

      horizontalResetAnimationsRef.current.delete(lineIndex);
      dragRef.current = {
        lineIndex,
        startX: event.clientX,
        startOffset: lineScrollRef.current.get(lineIndex) ?? 0,
        moved: false,
      };
    },
    []
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      const canvas = canvasRef.current;
      if (!drag || !canvas) return;

      const delta = drag.startX - event.clientX;
      if (!drag.moved && Math.abs(delta) < 4) return;
      drag.moved = true;
      if (!canvas.hasPointerCapture(event.pointerId)) {
        canvas.setPointerCapture(event.pointerId);
      }

      const line = linesRef.current[drag.lineIndex] ?? [];
      const availableWidth = Math.max(
        1,
        canvas.clientWidth - LEFT_GUTTER - RIGHT_GUTTER - 16
      );
      const metrics = getLineMetrics(canvas, line, availableWidth);
      const nextOffset = clamp(
        drag.startOffset + delta,
        0,
        metrics.maxScroll
      );
      horizontalResetAnimationsRef.current.delete(drag.lineIndex);
      if (nextOffset <= HORIZONTAL_OFFSET_EPSILON) {
        lineScrollRef.current.delete(drag.lineIndex);
        manualScrollLinesRef.current.delete(drag.lineIndex);
      } else {
        lineScrollRef.current.set(drag.lineIndex, nextOffset);
        manualScrollLinesRef.current.add(drag.lineIndex);
      }
      event.preventDefault();
      markDirty();
    },
    [markDirty]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const scroll = scrollRef.current;
      if (!canvas || !scroll) return;

      const drag = dragRef.current;
      dragRef.current = null;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      if (drag?.moved) {
        markDirty();
        return;
      }

      // While retiming, the selected line is the only keyboard target. Do not
      // let a canvas click silently move the transport to another line.
      if (useKaraokeStore.getState().editingLineIndex !== null) return;

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
    [actions, markDirty, onWordClick]
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLCanvasElement>) => {
      const delta = event.deltaX || (event.shiftKey ? event.deltaY : 0);
      if (delta === 0) return;

      const canvas = canvasRef.current;
      const scroll = scrollRef.current;
      if (!canvas || !scroll) return;

      const rect = canvas.getBoundingClientRect();
      const y = event.clientY - rect.top;
      const lineIndex = clamp(
        Math.floor((y + scroll.scrollTop) / ROW_HEIGHT),
        0,
        Math.max(0, linesRef.current.length - 1)
      );
      const line = linesRef.current[lineIndex] ?? [];
      const availableWidth = Math.max(
        1,
        canvas.clientWidth - LEFT_GUTTER - RIGHT_GUTTER - 16
      );
      const metrics = getLineMetrics(canvas, line, availableWidth);
      if (metrics.maxScroll <= 0) return;

      const currentOffset = lineScrollRef.current.get(lineIndex) ?? 0;
      const nextOffset = clamp(
        currentOffset + delta,
        0,
        metrics.maxScroll
      );
      if (nextOffset === currentOffset) return;

      event.preventDefault();
      horizontalResetAnimationsRef.current.delete(lineIndex);
      if (nextOffset <= HORIZONTAL_OFFSET_EPSILON) {
        lineScrollRef.current.delete(lineIndex);
        manualScrollLinesRef.current.delete(lineIndex);
      } else {
        lineScrollRef.current.set(lineIndex, nextOffset);
        manualScrollLinesRef.current.add(lineIndex);
      }
      markDirty();
    },
    [markDirty]
  );

  const handlePanelWheelCapture = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      // Keep horizontal trackpad/back-swipe gestures inside this panel. The
      // canvas handler still uses the event to move the active line itself.
      if (event.deltaX !== 0 || (event.shiftKey && event.deltaY !== 0)) {
        event.preventDefault();
      }
    },
    []
  );

  return (
    <div
      ref={scrollRef}
      className="relative h-full rounded-md border border-line bg-panel overflow-auto overscroll-none [&::-webkit-scrollbar]:hidden"
      onWheelCapture={handlePanelWheelCapture}
    >
      <div
        style={{
          height: Math.max(1, lyricsData.length * ROW_HEIGHT),
          position: "relative",
        }}
      >
        <canvas
          ref={canvasRef}
          className="sticky top-0 z-10 block w-full cursor-pointer"
          style={{
            fontFamily: "var(--font-lyrics)",
            touchAction: "pan-y",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          aria-label="Lyrics editor canvas"
        />
        {!hideLineActions && (
          <div className="pointer-events-none absolute inset-0 z-20">
            {lyricsData.map((_, lineIndex) => (
              <div
                key={`line-action-${lineIndex}`}
                className="pointer-events-auto absolute right-1"
                style={{
                  top: lineIndex * ROW_HEIGHT + ROW_HEIGHT / 2,
                  transform: "translateY(-50%)",
                }}
              >
                <LineAction lineIndex={lineIndex} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function getLineMetrics(
  canvas: HTMLCanvasElement,
  line: LyricWordData[],
  availableWidth: number
): { maxScroll: number } {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { maxScroll: 0 };

  const fontFamily = getComputedStyle(canvas).fontFamily || "sans-serif";
  ctx.font = `600 ${WORD_FONT_SIZE}px ${fontFamily}`;
  const wordWidths = measureWords(ctx, line);
  const totalWidth =
    wordWidths.reduce((sum, width) => sum + width, 0) +
    Math.max(0, line.length - 1) * WORD_GAP;
  return { maxScroll: Math.max(0, totalWidth - availableWidth) };
}

function measureWords(
  ctx: CanvasRenderingContext2D,
  line: LyricWordData[],
): number[] {
  return line.map((word) =>
    Math.max(52, ctx.measureText(word.text).width + 24)
  );
}

function getLineScrollLeft(
  line: LyricWordData[],
  wordWidths: number[],
  totalWidth: number,
  availableWidth: number,
  state: ReturnType<typeof useKaraokeStore.getState>,
  lineIndex: number,
  autoScroll: boolean,
  focusWordIndexOverride?: number | null,
  allowUnselectedLine = false
): number {
  if (!autoScroll) return 0;
  const focusWordIndex =
    focusWordIndexOverride !== undefined
      ? focusWordIndexOverride
      : state.isTimingActive || state.editingLineIndex !== null
        ? state.currentIndex
        : state.playbackIndex;

  if (focusWordIndex === null || focusWordIndex === -1) return 0;
  if (
    !line.some((word) => word.index === focusWordIndex) ||
    (!allowUnselectedLine && state.selectedLineIndex !== lineIndex)
  ) {
    return 0;
  }

  const focusPosition = line.findIndex((word) => word.index === focusWordIndex);
  if (focusPosition < 0) return 0;
  // Every line jump/replay starts from box 1 at the left edge. Centering the
  // first box makes the rest of a long line look as if it started mid-scroll.
  if (focusPosition === 0) return 0;

  const focusLeft = wordWidths
    .slice(0, focusPosition)
    .reduce((sum, width) => sum + width + WORD_GAP, 0);
  const focusCenter = focusLeft + wordWidths[focusPosition] / 2;
  const target = focusCenter - availableWidth / 2;
  return clamp(target, 0, Math.max(0, totalWidth - availableWidth));
}

export default React.memo(LyricsGrid);
