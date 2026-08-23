"use client";

import { FilePlus2, Plus } from "lucide-react";
import React, { useCallback, useEffect, useRef } from "react";

import ButtonCommon from "@/components/common/button";
import { useUiStore } from "@/features/ui/ui-store";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import { resizeCanvas, clamp } from "@/lib/canvas/runtime";
import type { LyricWordData } from "@/types/common.type";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import useIsMobile from "@/hooks/useIsMobile";
import LineAction from "./line/actions";
import {
  drawLyricWordBox,
  LYRICS_LEFT_GUTTER,
  LYRICS_RIGHT_GUTTER,
  LYRICS_ROW_HEIGHT,
  LYRICS_WORD_GAP,
  LYRICS_WORD_HEIGHT,
  measureLyricWords,
} from "../lyrics-word-renderer";
import {
  LYRICS_GRID_CENTER_ACTIVE_WORD_EVENT,
  LYRICS_GRID_SCROLL_TO_LINE_EVENT,
  LYRICS_PREVIEW_SCROLL_REQUEST_EVENT,
  publishLyricsPreviewViewport,
} from "../lyrics-preview-sync";

const MOBILE_BREAKPOINT = 1024;
const DESKTOP_GRID_METRICS = {
  rowHeight: LYRICS_ROW_HEIGHT,
  leftGutter: LYRICS_LEFT_GUTTER,
  rightGutter: LYRICS_RIGHT_GUTTER,
  wordGap: LYRICS_WORD_GAP,
  wordHeight: LYRICS_WORD_HEIGHT,
  wordFontSize: 15,
  vocalFontSize: 8,
  wordPadding: 24,
};
const MOBILE_GRID_METRICS = {
  rowHeight: 58,
  leftGutter: 30,
  rightGutter: 28,
  wordGap: 4,
  wordHeight: 32,
  wordFontSize: 13,
  vocalFontSize: 7,
  wordPadding: 16,
};

function getGridMetrics() {
  return typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT
    ? MOBILE_GRID_METRICS
    : DESKTOP_GRID_METRICS;
}

const getRowHeight = () => getGridMetrics().rowHeight;
const getLeftGutter = () => getGridMetrics().leftGutter;
const getRightGutter = () => getGridMetrics().rightGutter;
const getWordGap = () => getGridMetrics().wordGap;
const getWordHeight = () => getGridMetrics().wordHeight;
const getWordFontSize = () => getGridMetrics().wordFontSize;
const getVocalFontSize = () => getGridMetrics().vocalFontSize;
const getWordPadding = () => getGridMetrics().wordPadding;
const HORIZONTAL_RESET_DURATION_MS = 220;
const HORIZONTAL_OFFSET_EPSILON = 0.5;
const LINE_SELECTION_LONG_PRESS_MS = 450;
const POINTER_MOVE_CANCEL_DISTANCE = 6;
const DOUBLE_ACTIVATION_WINDOW_MS = 360;

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
  // Re-render when the viewport crosses the mobile breakpoint so the spacer
  // and the canvas use the same compact metrics after rotation/resize.
  const isMobile = useIsMobile();
  const gridMetrics = isMobile ? MOBILE_GRID_METRICS : getGridMetrics();
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const locale = useSettingsStore((state) => state.uiLocale);
  const onWordClick = usePlayerHandlersStore((state) => state.handleWordClick);
  const actions = useKaraokeStore((state) => state.actions);
  const openDialog = useUiStore((state) => state.openDialog);
  const lineSelectionMode = useKaraokeStore(
    (state) => state.lineSelectionMode
  );
  const selectedLineIndices = useKaraokeStore(
    (state) => state.selectedLineIndices
  );
  const lineSelectionAnchor = useKaraokeStore(
    (state) => state.lineSelectionAnchor
  );
  const lineShiftArmed = useKaraokeStore((state) => state.lineShiftArmed);
  const hideLineActions = useKaraokeStore(
    (state) =>
      state.isPlaying ||
      state.isTimingActive ||
      state.editingLineIndex !== null
  );
  // Playback follow is intentionally always enabled. It is part of the
  // editor navigation model rather than a user preference.
  const autoScroll = true;

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
  const longPressRef = useRef<{
    lineIndex: number;
    pointerId: number;
    startX: number;
    startY: number;
    timer: ReturnType<typeof setTimeout>;
    fired: boolean;
  } | null>(null);
  const doubleActivationRef = useRef<{
    lineIndex: number;
    at: number;
    pointerType: string;
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

  const clearLineSelectionLongPress = useCallback(() => {
    const longPress = longPressRef.current;
    if (!longPress) return;
    clearTimeout(longPress.timer);
    longPressRef.current = null;
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
    publishLyricsPreviewViewport(scroll);
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
        (scroll.scrollTop + scroll.clientHeight / 2) / getRowHeight()
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
    const firstLine = Math.max(0, Math.floor(scrollTop / getRowHeight()) - 1);
    const lastLine = Math.min(
      lines.length,
      Math.ceil((scrollTop + size.height) / getRowHeight()) + 1
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
          lineSelected: "rgba(120,170,255,0.22)",
          selectionAnchor: "rgba(244,189,104,0.20)",
          selectionAnchorBorder: "#f4bd68",
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
          lineSelected: "rgba(40,120,232,0.20)",
          selectionAnchor: "rgba(179,107,0,0.16)",
          selectionAnchorBorder: "#b36b00",
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
    const timingGroups = state.timingLineGroups ?? [];
    const activeTimingGroup =
      timingGroups[state.timingGroupIndex] ??
      (state.editingLineIndex !== null ? [state.editingLineIndex] : []);
    const activeTimingLineSet = new Set(activeTimingGroup);
    const retimingLineSet = new Set(timingGroups.flat());
    if (retimingLineSet.size === 0 && state.editingLineIndex !== null) {
      retimingLineSet.add(state.editingLineIndex);
    }
    const queuedTimingLineSet = new Set(
      timingGroups.slice(state.timingGroupIndex + 1).flat()
    );

    for (let lineIndex = firstLine; lineIndex < lastLine; lineIndex += 1) {
      const line = lines[lineIndex] ?? [];
      const y = lineIndex * getRowHeight() - scrollTop;
      const isPassedLine =
        focusLineIndex >= 0 && lineIndex < focusLineIndex;
      const isRetimingMode = state.editingLineIndex !== null;
      // A retiming session can contain multiple contiguous lines. The first
      // line is only the cursor origin; every line in the active group must
      // stay enabled and visibly belong to the current retiming operation.
      const isActiveTimingGroupLine =
        isRetimingMode && activeTimingLineSet.has(lineIndex);
      const isRetimingTargetLine =
        isRetimingMode && retimingLineSet.has(lineIndex);
      const isQueuedTimingLine =
        isRetimingMode &&
        queuedTimingLineSet.has(lineIndex) &&
        !isActiveTimingGroupLine;
      // Keep the preceding line live during the retiming pre-roll. Its
      // playback word must still receive the normal yellow highlight and its
      // existing green timing stamps must remain visible while the next line
      // is held as the orange target.
      const isPreparationLine =
        isRetimingMode && lineIndex === state.editingLineIndex! - 1;
      const isBackwardRetiming =
        isRetimingMode && state.correctionIndex !== null;
      const canShowPlaybackHighlight =
        !isRetimingMode || isPreparationLine || isBackwardRetiming;
      const isDisabledLine = isRetimingMode
        ? !isActiveTimingGroupLine &&
          !isPreparationLine &&
          !isQueuedTimingLine
        : isPassedLine;
      const selected = state.selectedLineIndex === lineIndex;
      const isLineSelected =
        state.lineSelectionMode &&
        state.selectedLineIndices.includes(lineIndex);
      const isSelectionAnchor =
        state.lineSelectionMode &&
        state.lineShiftArmed &&
        state.lineSelectionAnchor === lineIndex;
      const isTimingLine =
        state.isTimingActive && state.timingBuffer?.lineIndex === lineIndex;

      ctx.fillStyle = lineIndex % 2 === 0 ? colors.base : colors.alt;
      ctx.fillRect(0, y, size.width, getRowHeight());
      if (isRetimingTargetLine) {
        // Keep every line selected for this retiming session visible as one
        // orange preparation set, even while disconnected groups are handled
        // one group at a time by the keyboard workflow.
        ctx.fillStyle = colors.warnSoft;
        ctx.fillRect(0, y, size.width, getRowHeight());
      } else if (isSelectionAnchor) {
        ctx.fillStyle = colors.selectionAnchor;
        ctx.fillRect(0, y, size.width, getRowHeight());
        ctx.fillStyle = colors.selectionAnchorBorder;
        ctx.fillRect(0, y, size.width, 2);
        ctx.fillRect(0, y + getRowHeight() - 2, size.width, 2);
      } else if (isLineSelected) {
        ctx.fillStyle = colors.lineSelected;
        ctx.fillRect(0, y, size.width, getRowHeight());
      } else if (selected || isTimingLine) {
        ctx.fillStyle = colors.selected;
        ctx.fillRect(0, y, size.width, getRowHeight());
      }
      // Row rules separate lyric lines; do not paint one at the viewport edge
      // because the scroll container already owns that boundary.
      if (y + getRowHeight() < size.height - 0.5) {
        ctx.fillStyle = colors.border;
        ctx.fillRect(0, y + getRowHeight() - 1, size.width, 1);
      }

      ctx.fillStyle = colors.muted;
      ctx.font = `600 10px ${monoFamily}`;
      ctx.textAlign = "center";
      ctx.fillText(
        String(lineIndex + 1),
        getLeftGutter() / 2,
        y + getRowHeight() / 2
      );

      const availableWidth = Math.max(
        1,
        size.width - getLeftGutter() - getRightGutter() - 16
      );
      ctx.font = `600 ${getWordFontSize()}px ${fontFamily}`;
      const wordWidths = measureWords(ctx, line);
      const totalWidth =
        wordWidths.reduce((sum, width) => sum + width, 0) +
        Math.max(0, line.length - 1) * getWordGap();
      const startX = getLeftGutter() + 8;
      const maxLineScroll = Math.max(0, totalWidth - availableWidth);
      const lineScrollLeft = clamp(
        lineScrollRef.current.get(lineIndex) ?? 0,
        0,
        maxLineScroll
      );
      let x = startX - lineScrollLeft;

      ctx.save();
      ctx.beginPath();
      ctx.rect(startX, y, availableWidth, getRowHeight());
      ctx.clip();
      ctx.textAlign = "center";
      line.forEach((word, wordIndex) => {
        ctx.font = `600 ${getWordFontSize()}px ${fontFamily}`;
        // Keep the measured width. Overflow is clipped and scrolled within
        // this line's own word area.
        const boxWidth = wordWidths[wordIndex];
        const boxY = y + (getRowHeight() - getWordHeight()) / 2;
        const boxX = x;
        const isPlaybackActive =
          canShowPlaybackHighlight && state.playbackIndex === word.index;
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
          isActiveTimingGroupLine &&
          retimingTargetIndex === word.index;
        const isCorrection = state.correctionIndex === word.index;
        // During retiming, the warn target is the single source of truth.
        // The correction marker is kept for normal timing correction, but it
        // must not create a second red action when ArrowLeft is pressed.
        const showCorrectionVisual = isCorrection && !isRetimingMode;
        const bufferEntry = state.timingBuffer?.buffer.get(word.index);
        const isTimed =
          word.at !== null ||
          (bufferEntry?.at !== null &&
            bufferEntry !== undefined &&
            word.index < state.currentIndex);

        const markerColor = showCorrectionVisual && !isDisabledLine
          ? colors.pending
          : isTimed
            ? isDisabledLine
              ? colors.disabledMuted
              : colors.timed
            : undefined;
        const borderColor = isDisabledLine
          ? colors.disabledBoxBorder
          : isRetimingTarget
          ? colors.warn
          : isPlaybackPending
          ? colors.active
          : isActive
          ? colors.active
          : showCorrectionVisual
          ? colors.pending
          : colors.boxBorder;
        drawLyricWordBox(
          ctx,
          word,
          boxX,
          boxY,
          boxWidth,
          getWordHeight(),
          {
            fill: isDisabledLine
              ? colors.disabledBox
              : isRetimingTarget
              ? colors.warnSoft
              : isPlaybackPending
              ? colors.selected
              : isPlaybackReady
              ? colors.playing
              : colors.box,
            border: borderColor,
            text: isDisabledLine ? colors.disabledText : colors.text,
            muted: isDisabledLine ? colors.disabledMuted : colors.muted,
            marker: markerColor,
          },
          {
            fontFamily,
            fontSize: getWordFontSize(),
            vocalFontSize: getVocalFontSize(),
            radius: 5,
            lineWidth:
              isRetimingTarget || isActive || showCorrectionVisual ? 2 : 1,
          }
        );

        if (boxX < startX + availableWidth && boxX + boxWidth > startX) {
          hitBoxesRef.current.push({
            index: word.index,
            lineIndex,
            left: Math.max(boxX, startX),
            top: boxY,
            right: Math.min(boxX + boxWidth, startX + availableWidth),
            bottom: boxY + getWordHeight(),
          });
        }
        x += boxWidth + getWordGap();
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
    const root = document.documentElement;
    const observer = new MutationObserver(() => markDirty());
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [markDirty]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const scroll = scrollRef.current;
    if (!canvas || !scroll) return;
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(scroll);
    const handleScroll = () => {
      resetHiddenLineScrolls();
      publishLyricsPreviewViewport(scroll);
      markDirty();
    };
    scroll.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      observer.disconnect();
      scroll.removeEventListener("scroll", handleScroll);
    };
  }, [markDirty, resetHiddenLineScrolls, resize]);

  useEffect(() => {
    resize();
    markDirty();
  }, [isMobile, markDirty, resize]);

  useEffect(() => {
    const handleScrollRequest = (event: Event) => {
      const request = (event as CustomEvent<{ start: number }>).detail;
      const scroll = scrollRef.current;
      if (!scroll || !request) return;

      const maxScroll = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
      const nextScrollTop = Math.max(0, Math.min(1, request.start)) * maxScroll;
      if (Math.abs(scroll.scrollTop - nextScrollTop) > 0.5) {
        scroll.scrollTop = nextScrollTop;
        publishLyricsPreviewViewport(scroll);
      }
    };

    window.addEventListener(
      LYRICS_PREVIEW_SCROLL_REQUEST_EVENT,
      handleScrollRequest
    );
    return () =>
      window.removeEventListener(
        LYRICS_PREVIEW_SCROLL_REQUEST_EVENT,
        handleScrollRequest
      );
  }, []);

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
      if (!canvas || !scroll) return;

      const syncLineOffset = (
        lineIndex: number | null,
        focusWordIndex: number | null,
        allowUnselectedLine: boolean
      ) => {
        if (
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
          (reviewCenterLine === null ||
            Math.abs(lineIndex - reviewCenterLine) > 1) &&
          state.editingLineIndex === null
        ) {
          // Normal playback ignores hidden lines. Retiming is different: the
          // preparation line and edit target both need to stay readable while
          // the transport moves between them.
          return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const fontFamily = getComputedStyle(canvas).fontFamily || "sans-serif";
        ctx.font = `600 ${getWordFontSize()}px ${fontFamily}`;
        const wordWidths = measureWords(ctx, line);
        const totalWidth =
          wordWidths.reduce((sum, width) => sum + width, 0) +
          Math.max(0, line.length - 1) * getWordGap();
        const availableWidth = Math.max(
          1,
          scroll.clientWidth - getLeftGutter() - getRightGutter() - 16
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
          allowUnselectedLine
        );

        if (
          manualScrollLinesRef.current.has(lineIndex) ||
          horizontalResetAnimationsRef.current.has(lineIndex)
        ) {
          if (state.editingLineIndex !== null) {
            // Retiming owns both visible timing lines. A previous touch
            // movement must not leave either active word off-screen.
            manualScrollLinesRef.current.delete(lineIndex);
            horizontalResetAnimationsRef.current.delete(lineIndex);
          } else {
            return;
          }
        }

        const currentOffset = lineScrollRef.current.get(lineIndex) ?? 0;
        if (Math.abs(currentOffset - lineOffset) <= 0.5) return;

        if (lineOffset === 0) {
          lineScrollRef.current.delete(lineIndex);
        } else {
          lineScrollRef.current.set(lineIndex, lineOffset);
        }
        markDirty();
      };

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

      syncLineOffset(lineIndex, focusWordIndex, isRetimingPreparation);

      // When correcting backwards, playback deliberately runs through the
      // preceding line before returning to the edit target. Keep that yellow
      // preparation word centred as well as the target line.
      if (
        state.editingLineIndex !== null &&
        state.isTimingActive &&
        state.playbackIndex !== null
      ) {
        const playbackWord = linesRef.current
          .flat()
          .find((word) => word.index === state.playbackIndex);
        if (playbackWord && playbackWord.lineIndex !== lineIndex) {
          syncLineOffset(playbackWord.lineIndex, playbackWord.index, true);
        }
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
      const target = selectedLineIndex * getRowHeight();
      const scroll = scrollRef.current;
      const centeredTop = Math.max(
        0,
        Math.min(
          Math.max(0, scroll.scrollHeight - scroll.clientHeight),
          target - scroll.clientHeight / 2 + getRowHeight() / 2
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
    let followedPlaybackLineIndex: number | null = null;
    syncActiveLineScroll(initialState);
    const handleScrollToLine = (event: Event) => {
      const lineIndex = (event as CustomEvent<{ lineIndex?: number }>).detail
        ?.lineIndex;
      if (typeof lineIndex !== "number" || !Number.isInteger(lineIndex)) {
        return;
      }
      scrollToSelectedLine(lineIndex, true);
    };
    window.addEventListener(
      LYRICS_GRID_SCROLL_TO_LINE_EVENT,
      handleScrollToLine
    );
    const unsubscribe = useKaraokeStore.subscribe((next, previous) => {
      const selectedLineChanged =
        next.selectedLineIndex !== previous.selectedLineIndex;
      const playbackLineIndex =
        next.isPlaying && next.playbackIndex !== null
          ? next.lyricsData.find((line) =>
              line.some((word) => word.index === next.playbackIndex)
            )?.[0]?.lineIndex ?? null
          : null;
      if (selectedLineChanged) {
        // A line's horizontal scroll is only useful while that line is
        // active. Reset the line we just left so returning to it never opens
        // at a stale right-side box.
        if (previous.selectedLineIndex !== null) {
          resetLineScroll(previous.selectedLineIndex);
        }
        syncActiveLineScroll(next);
        // Canvas highlights are rendered outside React, so selecting a line
        // must explicitly request a redraw even when no horizontal offset
        // changed.
        markDirty();
      }
      if (!next.isPlaying) {
        followedPlaybackLineIndex = null;
      } else if (
        playbackLineIndex !== null &&
        playbackLineIndex !== followedPlaybackLineIndex
      ) {
        // Only the active playback word may move the vertical viewport.
        // Selecting/highlighting a line must remain a local action, even if
        // the player is already running.
        followedPlaybackLineIndex = playbackLineIndex;
        scrollToSelectedLine(playbackLineIndex, true);
      }
      if (
        next.editingLineIndex !== previous.editingLineIndex &&
        next.editingLineIndex !== null
      ) {
        // Retiming always starts from the first box of the target line. Do
        // not carry over a horizontal offset left by normal playback/editing.
        resetLineScroll(next.editingLineIndex);
        // Entering retiming is also a navigation event when this line was
        // already selected but the user had scrolled the page elsewhere.
        if (!selectedLineChanged) {
          scrollToSelectedLine(next.editingLineIndex, true);
        }
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
        next.editingLineIndex !== previous.editingLineIndex ||
        next.lineSelectionMode !== previous.lineSelectionMode ||
        next.selectedLineIndices !== previous.selectedLineIndices ||
        next.lineSelectionAnchor !== previous.lineSelectionAnchor ||
        next.lineShiftArmed !== previous.lineShiftArmed
      ) {
        if (!playbackStopped) syncActiveLineScroll(next);
        markDirty();
      }
    });
    return () => {
      window.removeEventListener(
        LYRICS_GRID_SCROLL_TO_LINE_EVENT,
        handleScrollToLine
      );
      unsubscribe();
    };
  }, [autoScroll, markDirty, resetLineScroll, syncActiveLineScroll]);

  useEffect(() => {
    const handleCenterActiveWord = () => {
      const state = useKaraokeStore.getState();
      if (state.editingLineIndex === null) return;
      syncActiveLineScroll(state);
    };

    window.addEventListener(
      LYRICS_GRID_CENTER_ACTIVE_WORD_EVENT,
      handleCenterActiveWord
    );
    return () =>
      window.removeEventListener(
        LYRICS_GRID_CENTER_ACTIVE_WORD_EVENT,
        handleCenterActiveWord
      );
  }, [syncActiveLineScroll]);

  useEffect(() => {
    const horizontalResetAnimations = horizontalResetAnimationsRef.current;

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (horizontalResetFrameRef.current !== null) {
        cancelAnimationFrame(horizontalResetFrameRef.current);
        horizontalResetFrameRef.current = null;
      }
      clearLineSelectionLongPress();
      horizontalResetAnimations.clear();
    };
  }, [clearLineSelectionLongPress]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const scroll = scrollRef.current;
      if (!canvas || !scroll) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const lineIndex = clamp(
        Math.floor((y + scroll.scrollTop) / getRowHeight()),
        0,
        Math.max(0, linesRef.current.length - 1)
      );

      if (linesRef.current.length === 0) return;

      clearLineSelectionLongPress();
      const state = useKaraokeStore.getState();
      if (
        !state.lineSelectionMode &&
        !state.isPlaying &&
        state.editingLineIndex === null
      ) {
        const longPress = {
          lineIndex,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          timer: setTimeout(() => {
            const currentState = useKaraokeStore.getState();
            const activeLongPress = longPressRef.current;
            if (
              !activeLongPress ||
              activeLongPress.pointerId !== event.pointerId ||
              currentState.lineSelectionMode ||
              currentState.isPlaying ||
              currentState.editingLineIndex !== null
            ) {
              return;
            }

            currentState.actions.setLineSelectionMode(true);
            currentState.actions.toggleLineSelection(lineIndex);
            activeLongPress.fired = true;
            dragRef.current = null;
            markDirty();
          }, LINE_SELECTION_LONG_PRESS_MS),
          fired: false,
        };
        longPressRef.current = longPress;
      }

      const availableWidth = Math.max(
        1,
        canvas.clientWidth - getLeftGutter() - getRightGutter() - 16
      );
      const startX = getLeftGutter() + 8;
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
    [clearLineSelectionLongPress, markDirty]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const longPress = longPressRef.current;
      if (
        longPress &&
        longPress.pointerId === event.pointerId &&
        !longPress.fired &&
        (Math.abs(event.clientX - longPress.startX) >=
          POINTER_MOVE_CANCEL_DISTANCE ||
          Math.abs(event.clientY - longPress.startY) >=
            POINTER_MOVE_CANCEL_DISTANCE)
      ) {
        clearLineSelectionLongPress();
      }

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
        canvas.clientWidth - getLeftGutter() - getRightGutter() - 16
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
    [clearLineSelectionLongPress, markDirty]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const scroll = scrollRef.current;
      if (!canvas || !scroll) return;

      const drag = dragRef.current;
      dragRef.current = null;
      const longPress = longPressRef.current;
      clearLineSelectionLongPress();
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      if (longPress?.pointerId === event.pointerId && longPress.fired) {
        return;
      }
      if (drag?.moved) {
        markDirty();
        return;
      }

      // While retiming, the selected line is the only keyboard target. Do not
      // let a canvas click silently move the transport to another line.
      const currentState = useKaraokeStore.getState();
      if (currentState.editingLineIndex !== null) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const lineIndex = clamp(
        Math.floor((y + scroll.scrollTop) / getRowHeight()),
        0,
        Math.max(0, linesRef.current.length - 1)
      );

      // Selection mode owns the complete row. Clicking anywhere on a line
      // only toggles that line; it must never seek, play, or open its menu.
      if (currentState.lineSelectionMode) {
        actions.toggleLineSelection(lineIndex, event.shiftKey);
        return;
      }

      const now = performance.now();
      const previousActivation = doubleActivationRef.current;
      const isDoubleActivation =
        previousActivation !== null &&
        previousActivation.lineIndex === lineIndex &&
        previousActivation.pointerType === event.pointerType &&
        now - previousActivation.at <= DOUBLE_ACTIVATION_WINDOW_MS &&
        (event.detail >= 2 || event.pointerType === "touch");

      if (isDoubleActivation) {
        doubleActivationRef.current = null;
        event.preventDefault();
        actions.setPlayFromScrolledPosition(false);
        actions.selectLine(lineIndex);
        actions.openEditModal();
        return;
      }

      doubleActivationRef.current = {
        lineIndex,
        at: now,
        pointerType: event.pointerType,
      };

      const hit = [...hitBoxesRef.current].reverse().find(
        (box) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom
      );
      if (hit) {
        void onWordClick(hit.index);
        return;
      }

      if (x >= rect.width - getRightGutter()) {
        actions.setPlayFromScrolledPosition(false);
        actions.selectLine(lineIndex);
        actions.openEditModal();
      } else {
        actions.setPlayFromScrolledPosition(false);
        actions.selectLine(lineIndex);
      }
    },
    [actions, clearLineSelectionLongPress, markDirty, onWordClick]
  );

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const scroll = scrollRef.current;
      if (!canvas || !scroll) return;

      const currentState = useKaraokeStore.getState();
      if (
        currentState.lineSelectionMode ||
        currentState.editingLineIndex !== null
      ) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const lineIndex = clamp(
        Math.floor(
          (event.clientY - rect.top + scroll.scrollTop) / getRowHeight()
        ),
        0,
        Math.max(0, linesRef.current.length - 1)
      );

      event.preventDefault();
      actions.setPlayFromScrolledPosition(false);
      actions.selectLine(lineIndex);
      actions.openEditModal();
    },
    [actions]
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (longPressRef.current?.pointerId === event.pointerId) {
        clearLineSelectionLongPress();
      }
      dragRef.current = null;
    },
    [clearLineSelectionLongPress]
  );

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (longPressRef.current?.fired) event.preventDefault();
    },
    []
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
        Math.floor((y + scroll.scrollTop) / getRowHeight()),
        0,
        Math.max(0, linesRef.current.length - 1)
      );
      const line = linesRef.current[lineIndex] ?? [];
      const availableWidth = Math.max(
        1,
        canvas.clientWidth - getLeftGutter() - getRightGutter() - 16
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
      className="relative h-full rounded-md border border-line border-l-0 bg-base overflow-auto overscroll-none [&::-webkit-scrollbar]:hidden"
      onWheelCapture={handlePanelWheelCapture}
    >
      <div
        style={{
          height: Math.max(1, lyricsData.length * gridMetrics.rowHeight),
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
          onPointerCancel={handlePointerCancel}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          onWheel={handleWheel}
          aria-label="Lyrics editor canvas"
        />
        {lineSelectionMode && !hideLineActions && (
          <div className="pointer-events-none absolute inset-0 z-30">
            {lyricsData.map((_, lineIndex) => {
              const checked = selectedLineIndices.includes(lineIndex);
              const isAnchor =
                lineShiftArmed && lineSelectionAnchor === lineIndex;
              return (
                <button
                  key={`line-select-${lineIndex}`}
                  type="button"
                  className={`pointer-events-auto absolute left-1 flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-semibold transition ${
                    isAnchor
                      ? "border-warn bg-warn/15 text-warn ring-2 ring-warn/30"
                      : checked
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-line-strong bg-panel text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
                  style={{
                    top:
                      lineIndex * gridMetrics.rowHeight +
                      gridMetrics.rowHeight / 2,
                    transform: "translateY(-50%)",
                  }}
                  aria-label={`${checked ? "ยกเลิกเลือก" : "เลือก"} บรรทัด ${lineIndex + 1}`}
                  aria-pressed={checked}
                  onClick={(event) => {
                    event.stopPropagation();
                    actions.toggleLineSelection(lineIndex, event.shiftKey);
                  }}
                >
                  {lineIndex + 1}
                </button>
              );
            })}
          </div>
        )}
        {!hideLineActions && !lineSelectionMode && (
          <div className="pointer-events-none absolute inset-0 z-20">
            {lyricsData.map((_, lineIndex) => (
              <div
                key={`line-action-${lineIndex}`}
                className="pointer-events-auto absolute right-1"
                style={{
                  top:
                    lineIndex * gridMetrics.rowHeight +
                    gridMetrics.rowHeight / 2,
                  transform: "translateY(-50%)",
                }}
              >
                <LineAction lineIndex={lineIndex} />
              </div>
            ))}
          </div>
        )}
      </div>
      {lyricsData.length === 0 && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-base/95 p-6">
          <div className="flex max-w-sm flex-col items-center text-center">
            <span className="mb-3 grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <FilePlus2 className="size-6" />
            </span>
            <h2 className="text-base font-semibold text-foreground">
              {text(locale, "ยังไม่มีเนื้อร้อง", "No lyrics yet")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {text(
                locale,
                "เพิ่มบรรทัดแรกเพื่อเริ่มแก้ไขเนื้อเพลง",
                "Add the first line to start editing lyrics"
              )}
            </p>
            <ButtonCommon
              className="mt-4"
              color="primary"
              icon={<Plus />}
              onClick={() => openDialog("lyrics")}
            >
              {text(locale, "เพิ่มเนื้อร้อง", "Add lyrics")}
            </ButtonCommon>
          </div>
        </div>
      )}
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
  ctx.font = `600 ${getWordFontSize()}px ${fontFamily}`;
  const wordWidths = measureWords(ctx, line);
  const totalWidth =
    wordWidths.reduce((sum, width) => sum + width, 0) +
    Math.max(0, line.length - 1) * getWordGap();
  return { maxScroll: Math.max(0, totalWidth - availableWidth) };
}

function measureWords(
  ctx: CanvasRenderingContext2D,
  line: LyricWordData[],
): number[] {
  return measureLyricWords(ctx, line, getWordPadding());
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
    .reduce((sum, width) => sum + width + getWordGap(), 0);
  const focusCenter = focusLeft + wordWidths[focusPosition] / 2;
  const target = focusCenter - availableWidth / 2;
  return clamp(target, 0, Math.max(0, totalWidth - availableWidth));
}

export default React.memo(LyricsGrid);
