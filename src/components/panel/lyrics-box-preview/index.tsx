"use client";

import React, { useCallback, useEffect, useRef } from "react";

import { clamp, resizeCanvas } from "@/lib/canvas/runtime";
import type { LyricWordData } from "@/types/common.type";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { useTimerStore } from "@/timer-worker/store";
import useIsMobile from "@/hooks/useIsMobile";
import { LYRICS_MIN_WORD_WIDTH } from "@/components/lyrics/lyrics-word-renderer";

// This is deliberately a small, independent canvas renderer. It borrows the
// lyric-box measurements and colours from LyricsGrid, but never mounts
// LyricsGrid itself, so the chord view does not create a second editor grid.
const ROW_HEIGHT = 70;
const WORD_GAP = 7;
const WORD_HEIGHT = 40;
const WORD_FONT_SIZE = 15;
const VOCAL_FONT_SIZE = 8;
const PREVIEW_GUTTER = 8;
const VERTICAL_LINE_GAP = 10;
const VERTICAL_BOX_HEIGHT = 40;

interface PreviewWord {
  position: number;
  word: LyricWordData;
  at: number | null;
}

interface PreviewLine {
  lineIndex: number;
  words: PreviewWord[];
}

interface LyricsBoxPreviewProps {
  compact?: boolean;
  onClose?: () => void;
}

function getVerticalLineHeight(
  words: Array<{ vocal?: string } | PreviewWord>
): number {
  const contentHeight = words.reduce(
    (height, word) => {
      const vocal = "word" in word ? word.word.vocal : word.vocal;
      return height + (vocal ? 48 : VERTICAL_BOX_HEIGHT);
    },
    0
  );
  return Math.max(
    ROW_HEIGHT,
    PREVIEW_GUTTER * 2 +
      contentHeight +
      Math.max(0, words.length - 1) * WORD_GAP
  );
}

function getVerticalLineTop(lines: PreviewLine[], lineIndex: number): number {
  let top = 0;
  for (let index = 0; index < lineIndex; index += 1) {
    top += getVerticalLineHeight(lines[index]?.words ?? []);
    top += VERTICAL_LINE_GAP;
  }
  return top;
}

function getVerticalContentHeight(lines: LyricWordData[][]): number {
  return Math.max(
    1,
    lines.reduce(
      (height, line, index) =>
        height +
        getVerticalLineHeight(line) +
        (index > 0 ? VERTICAL_LINE_GAP : 0),
      0
    )
  );
}

const LyricsBoxPreview: React.FC<LyricsBoxPreviewProps> = ({
  compact = false,
  onClose,
}) => {
  const isMobile = useIsMobile();
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const timingBuffer = useKaraokeStore((state) => state.timingBuffer);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const linesRef = useRef<PreviewLine[]>([]);
  const wordPositionByIndexRef = useRef(new Map<number, number>());
  const timedPositionsRef = useRef<Array<{ position: number; at: number }>>(
    []
  );
  const lineScrollRef = useRef(new Map<number, number>());
  const activePositionRef = useRef(-1);
  const activeLineRef = useRef(-1);
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

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const scroll = scrollRef.current;
    if (!canvas || !scroll) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = sizeRef.current;
    const isDark = document.documentElement.classList.contains("dark");
    const fontFamily = getComputedStyle(canvas).fontFamily || "sans-serif";
    const colors = isDark
      ? {
          background: "#202a38",
          base: "#202a38",
          alt: "#202a38",
          text: "#f4f7fb",
          muted: "#8795a8",
          box: "#18212d",
          boxBorder: "#3b4a5d",
          disabledBox: "#10161f",
          disabledBoxBorder: "#263241",
          disabledText: "#667386",
          disabledMuted: "#4b5563",
          timed: "#49d17d",
          playing: "#f6dc67",
        }
      : {
          background: "#f8f9fc",
          base: "#f8f9fc",
          alt: "#f8f9fc",
          text: "#1c2430",
          muted: "#7b8796",
          box: "#ffffff",
          boxBorder: "#c9d2df",
          disabledBox: "#e5e7eb",
          disabledBoxBorder: "#cbd5e1",
          disabledText: "#9ca3af",
          disabledMuted: "#9ca3af",
          timed: "#1caa58",
          playing: "#f0d14b",
        };

    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.textBaseline = "middle";

    const activePosition = activePositionRef.current;
    const drawWordBox = (
      entry: PreviewWord,
      x: number,
      y: number,
      boxWidth: number,
      boxHeight = WORD_HEIGHT,
      markerOnTop = false
    ) => {
      const isPast = activePosition >= 0 && entry.position < activePosition;
      const isActive = entry.position === activePosition;

      ctx.fillStyle = isPast
        ? colors.disabledBox
        : isActive
        ? colors.playing
        : colors.box;
      ctx.fillRect(x, y, boxWidth, boxHeight);

      if (entry.at !== null) {
        ctx.fillStyle = isPast ? colors.disabledMuted : colors.timed;
        if (markerOnTop) {
          ctx.fillRect(x, y, boxWidth, 3);
        } else {
          ctx.fillRect(x, y, 3, boxHeight);
        }
      }

      ctx.strokeStyle = isPast
        ? colors.disabledBoxBorder
        : isActive
        ? colors.playing
        : colors.boxBorder;
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.strokeRect(x, y, boxWidth, boxHeight);

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, boxWidth, boxHeight);
      ctx.clip();
      ctx.textAlign = "center";
      ctx.font = `600 ${WORD_FONT_SIZE}px ${fontFamily}`;
      ctx.fillStyle = isPast ? colors.disabledText : colors.text;
      ctx.fillText(entry.word.text, x + boxWidth / 2, y + boxHeight / 2);
      if (entry.word.vocal) {
        ctx.font = `500 ${VOCAL_FONT_SIZE}px ${fontFamily}`;
        ctx.fillStyle = isPast ? colors.disabledMuted : colors.muted;
        ctx.fillText(entry.word.vocal, x + boxWidth / 2, y + boxHeight - 6);
      }
      ctx.restore();
    };

    if (isMobile) {
      const scrollTop = scroll.scrollTop;
      const firstLine = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 1);
      const lastLine = Math.min(
        linesRef.current.length,
        Math.ceil((scrollTop + size.height) / ROW_HEIGHT) + 1
      );
      const availableWidth = Math.max(
        1,
        size.width - PREVIEW_GUTTER * 2
      );

      for (let lineIndex = firstLine; lineIndex < lastLine; lineIndex += 1) {
        const line = linesRef.current[lineIndex];
        if (!line) continue;

        const y = lineIndex * ROW_HEIGHT - scrollTop;
        ctx.fillStyle = lineIndex % 2 === 0 ? colors.base : colors.alt;
        ctx.fillRect(0, y, size.width, ROW_HEIGHT);
        ctx.font = `600 ${WORD_FONT_SIZE}px ${fontFamily}`;
        const wordWidths = line.words.map((entry) =>
          Math.max(
            LYRICS_MIN_WORD_WIDTH,
            ctx.measureText(entry.word.text).width + 24
          )
        );
        const totalWidth =
          wordWidths.reduce((sum, width) => sum + width, 0) +
          Math.max(0, line.words.length - 1) * WORD_GAP;
        const maxScroll = Math.max(0, totalWidth - availableWidth);
        let x =
          PREVIEW_GUTTER -
          clamp(lineScrollRef.current.get(lineIndex) ?? 0, 0, maxScroll);

        ctx.save();
        ctx.beginPath();
        ctx.rect(PREVIEW_GUTTER, y, availableWidth, ROW_HEIGHT);
        ctx.clip();
        line.words.forEach((entry, wordIndex) => {
          drawWordBox(
            entry,
            x,
            y + (ROW_HEIGHT - WORD_HEIGHT) / 2,
            wordWidths[wordIndex]
          );
          x += wordWidths[wordIndex] + WORD_GAP;
        });
        ctx.restore();
      }
    } else {
      // Desktop keeps the vertical scroll model: every lyric word is a full
      // width, content-sized rectangle stacked inside its line.
      if (contentRef.current) contentRef.current.style.width = "100%";
      const scrollTop = scroll.scrollTop;
      let lineTop = 0;

      for (const line of linesRef.current) {
        const lineHeight = getVerticalLineHeight(line.words);
        const lineBottom = lineTop + lineHeight;
        if (lineBottom >= scrollTop && lineTop <= scrollTop + size.height) {
          let boxTop = lineTop + PREVIEW_GUTTER - scrollTop;
          line.words.forEach((entry) => {
            const boxHeight = entry.word.vocal ? 48 : VERTICAL_BOX_HEIGHT;
            drawWordBox(entry, 0, boxTop, size.width, boxHeight);
            boxTop += boxHeight + WORD_GAP;
          });
        }
        lineTop += lineHeight + VERTICAL_LINE_GAP;
        if (lineTop > scrollTop + size.height && lineBottom > scrollTop) {
          break;
        }
      }
    }

    dirtyRef.current = false;
  }, [isMobile]);

  const getActivePosition = useCallback(() => {
    const state = useKaraokeStore.getState();
    const timerState = useTimerStore.getState();

    if (
      state.isPlaying &&
      timerState.presentationRunning &&
      state.playbackIndex !== null
    ) {
      const playbackPosition = wordPositionByIndexRef.current.get(
        state.playbackIndex
      );
      if (playbackPosition !== undefined) return playbackPosition;
    }

    const tick = timerState.presentationValue;
    const timedPositions = timedPositionsRef.current;
    let low = 0;
    let high = timedPositions.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (timedPositions[middle].at <= tick) low = middle + 1;
      else high = middle;
    }
    return low > 0 ? timedPositions[low - 1].position : -1;
  }, []);

  const syncToCurrent = useCallback((force = false) => {
    const scroll = scrollRef.current;
    const canvas = canvasRef.current;
    if (!scroll || !canvas || linesRef.current.length === 0) {
      activePositionRef.current = -1;
      activeLineRef.current = -1;
      markDirty();
      return;
    }

    const nextPosition = getActivePosition();
    const previousPosition = activePositionRef.current;
    if (nextPosition === previousPosition && !force) return;

    const previousLine = activeLineRef.current;
    let nextLine = -1;
    for (const line of linesRef.current) {
      if (line.words.some((entry) => entry.position === nextPosition)) {
        nextLine = line.lineIndex;
        break;
      }
    }

    activePositionRef.current = nextPosition;
    activeLineRef.current = nextLine;

    if (nextLine >= 0 && nextLine !== previousLine) {
      if (previousLine >= 0) lineScrollRef.current.delete(previousLine);

      if (isMobile) {
        const targetTop = clamp(
          nextLine * ROW_HEIGHT - scroll.clientHeight / 2 + ROW_HEIGHT / 2,
          0,
          Math.max(0, scroll.scrollHeight - scroll.clientHeight)
        );
        if (Math.abs(scroll.scrollTop - targetTop) > 0.5) {
          scroll.scrollTo({ top: targetTop, behavior: "smooth" });
        }
      } else {
        const line = linesRef.current[nextLine];
        const lineTop = getVerticalLineTop(linesRef.current, nextLine);
        const lineHeight = getVerticalLineHeight(line?.words ?? []);
        const targetTop = clamp(
          lineTop - scroll.clientHeight / 2 + lineHeight / 2,
          0,
          Math.max(0, scroll.scrollHeight - scroll.clientHeight)
        );
        if (Math.abs(scroll.scrollTop - targetTop) > 0.5) {
          scroll.scrollTo({ top: targetTop, behavior: "smooth" });
        }
      }
    }

    if (isMobile && nextLine >= 0 && nextPosition >= 0) {
      const line = linesRef.current[nextLine];
      const ctx = canvas.getContext("2d");
      if (ctx && line) {
        const fontFamily = getComputedStyle(canvas).fontFamily || "sans-serif";
        ctx.font = `600 ${WORD_FONT_SIZE}px ${fontFamily}`;
        const widths = line.words.map((entry) =>
          Math.max(
            LYRICS_MIN_WORD_WIDTH,
            ctx.measureText(entry.word.text).width + 24
          )
        );
        const activeWordIndex = line.words.findIndex(
          (entry) => entry.position === nextPosition
        );
        const beforeActive = line.words
          .slice(0, activeWordIndex)
          .reduce((sum, entry, index) => sum + widths[index] + WORD_GAP, 0);
        const activeWidth = widths[activeWordIndex] ?? 0;
        const availableWidth = Math.max(
          1,
          canvas.clientWidth - PREVIEW_GUTTER * 2
        );
        const totalWidth =
          widths.reduce((sum, width) => sum + width, 0) +
          Math.max(0, widths.length - 1) * WORD_GAP;
        const nextOffset = clamp(
          beforeActive + activeWidth / 2 - availableWidth / 2,
          0,
          Math.max(0, totalWidth - availableWidth)
        );
        lineScrollRef.current.set(nextLine, nextOffset);
      }
    }

    markDirty();
  }, [getActivePosition, isMobile, markDirty]);

  useEffect(() => {
    let position = 0;
    const nextPositionByIndex = new Map<number, number>();
    const nextTimedPositions: Array<{ position: number; at: number }> = [];
    const nextLines = lyricsData.map((line, lineIndex) => ({
      lineIndex,
      words: line.map((word) => {
        const buffered = timingBuffer?.buffer.get(word.index);
        nextPositionByIndex.set(word.index, position);
        const at = buffered !== undefined ? buffered.at : word.at;
        if (at !== null) nextTimedPositions.push({ position, at });
        return {
          position: position++,
          word,
          at,
        };
      }),
    }));
    linesRef.current = nextLines;
    wordPositionByIndexRef.current = nextPositionByIndex;
    timedPositionsRef.current = nextTimedPositions.sort(
      (left, right) => left.at - right.at
    );
    activePositionRef.current = -1;
    activeLineRef.current = -1;
    lineScrollRef.current.clear();
    markDirty();
    syncToCurrent();
  }, [lyricsData, timingBuffer, markDirty, syncToCurrent]);

  useEffect(() => {
    drawRef.current = draw;
    markDirty();
  }, [draw, markDirty]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const scroll = scrollRef.current;
    if (!canvas || !scroll) return;

    const resize = () => {
      canvas.style.width = `${Math.max(1, scroll.clientWidth)}px`;
      canvas.style.height = `${Math.max(1, scroll.clientHeight)}px`;
      if (contentRef.current) contentRef.current.style.width = "100%";
      sizeRef.current = resizeCanvas(canvas);
      markDirty();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(scroll);

    const handleScroll = () => markDirty();
    scroll.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      observer.disconnect();
      scroll.removeEventListener("scroll", handleScroll);
    };
  }, [isMobile, markDirty]);

  useEffect(() => {
    activeLineRef.current = -1;
    syncToCurrent(true);
  }, [isMobile, syncToCurrent]);

  useEffect(() => {
    const unsubscribeTimer = useTimerStore.subscribe((next, previous) => {
      if (
        next.presentationValue !== previous.presentationValue ||
        next.presentationRunning !== previous.presentationRunning
      ) {
        syncToCurrent();
      }
    });
    const unsubscribeKaraoke = useKaraokeStore.subscribe((next, previous) => {
      if (
        next.playbackIndex !== previous.playbackIndex ||
        next.isPlaying !== previous.isPlaying
      ) {
        syncToCurrent();
      }
    });

    syncToCurrent();
    return () => {
      unsubscribeTimer();
      unsubscribeKaraoke();
    };
  }, [syncToCurrent]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    []
  );

  return (
    <section
      className={
        compact
          ? "flex h-full min-h-0 flex-col overflow-hidden rounded-md bg-panel-2"
          : "flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-line bg-panel"
      }
    >
      {!compact && (
        <header className="flex shrink-0 items-center justify-between border-b border-line bg-lane px-3 py-2">
          <h2 className="truncate text-sm font-semibold text-foreground">
            Lyrics Preview
          </h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-line-soft px-2 py-1 text-xs text-muted-foreground transition hover:bg-panel-2 hover:text-foreground"
            >
              Close
            </button>
          )}
        </header>
      )}
      <div
        ref={scrollRef}
        className={`min-h-0 flex-1 overscroll-contain [scrollbar-width:thin] ${
          isMobile
            ? "overflow-y-auto overflow-x-hidden"
            : "overflow-y-auto overflow-x-hidden"
        }`}
      >
        <div
          ref={contentRef}
          style={{
            height: isMobile
              ? Math.max(1, lyricsData.length * ROW_HEIGHT)
              : getVerticalContentHeight(lyricsData),
            minWidth: "100%",
            position: "relative",
          }}
        >
          <canvas
            ref={canvasRef}
            className="sticky left-0 top-0 z-10 block"
            style={{
              fontFamily: "var(--font-lyrics)",
              touchAction: "pan-y",
            }}
            aria-label="Lyrics box preview canvas"
          />
        </div>
      </div>
    </section>
  );
};

export default React.memo(LyricsBoxPreview);
