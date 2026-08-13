"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { useTimerStore } from "@/timer-worker/store";
import { usePlayerSetupStore } from "@/hooks/usePlayerSetup";
import useIsMobile from "@/hooks/useIsMobile";
import type { ChordEvent } from "@/lib/karaoke/midi/types";
import { clamp, resizeCanvas, roundedRect } from "@/lib/canvas/runtime";
import ChordEditModal from "@/components/modals/chord";
import ZoomControl from "./zoom";
import { AutoScroller } from "./scrolling";
import { ManualScroller } from "./scrolling/manual-scroller";

const PIXELS_PER_UNIT_MIDI = 0.1;
const PIXELS_PER_UNIT_TIME = 50;
const RULER_SIZE = 34;

interface ChordHitBox {
  chord: ChordEvent;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface DragState {
  chord: ChordEvent;
  startPosition: number;
  moved: boolean;
}

const ChordsBlock: React.FC = () => {
  const mode = useKaraokeStore((state) => state.mode) ?? "midi";
  const playerState = useKaraokeStore((state) => state.playerState);
  const chordsData = useKaraokeStore((state) => state.chordsData);
  const actions = useKaraokeStore((state) => state.actions);
  const playerControls = usePlayerSetupStore((state) => state.playerControls);
  const isMobile = useIsMobile();

  const [containerSize, setContainerSize] = useState({ width: 1, height: 1 });
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitBoxesRef = useRef<ChordHitBox[]>([]);
  const dragRef = useRef<DragState | null>(null);
  const scrollGestureRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const dragPreviewRef = useRef<number | null>(null);
  const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(true);
  const frameRef = useRef<number | null>(null);
  const drawRef = useRef<() => void>(() => undefined);
  const sizeRef = useRef({ width: 1, height: 1, dpr: 1 });

  const pixelsPerUnit =
    (mode === "midi" ? PIXELS_PER_UNIT_MIDI : PIXELS_PER_UNIT_TIME) * zoom;
  const playheadPosition = isMobile
    ? containerSize.width / 2
    : containerSize.height / 2;
  const totalDuration = playerState.duration ?? 0;
  const maxChordTick = chordsData[chordsData.length - 1]?.tick ?? 0;
  const trackSize = Math.max(
    1,
    totalDuration * pixelsPerUnit,
    (maxChordTick + 1) * pixelsPerUnit
  );
  const ppq = playerState.midi?.ticksPerBeat ?? 480;

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
    const container = containerRef.current;
    if (!canvas || !container) return;
    sizeRef.current = resizeCanvas(canvas);
    setContainerSize({
      width: Math.max(1, container.clientWidth),
      height: Math.max(1, container.clientHeight),
    });
    markDirty();
  }, [markDirty]);

  const getScrollPosition = useCallback(() => {
    const scroll = scrollContainerRef.current;
    if (!scroll) return 0;
    return isMobile ? scroll.scrollLeft : scroll.scrollTop;
  }, [isMobile]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const size = sizeRef.current;
    const scrollPosition = getScrollPosition();
    const isDark = document.documentElement.classList.contains("dark");
    const colors = isDark
      ? {
          panel: "#131a23",
          panelAlt: "#18212d",
          line: "#3b4a5d",
          strongLine: "#667991",
          muted: "#8795a8",
          text: "#f4f7fb",
          chord: "#18212d",
          chordBorder: "#5e89d7",
          active: "#78aaff",
          playhead: "#7da8ff",
        }
      : {
          panel: "#f2f5f9",
          panelAlt: "#eaf0f7",
          line: "#c9d2df",
          strongLine: "#8798ad",
          muted: "#7b8796",
          text: "#1c2430",
          chord: "#ffffff",
          chordBorder: "#2878e8",
          active: "#2878e8",
          playhead: "#2878e8",
        };

    const fontFamily = getComputedStyle(canvas).fontFamily || "sans-serif";
    const monoFamily = "ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.fillStyle = colors.panel;
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    hitBoxesRef.current = [];

    drawRuler(
      ctx,
      size.width,
      size.height,
      scrollPosition,
      playheadPosition,
      pixelsPerUnit,
      totalDuration,
      mode,
      ppq,
      zoom,
      isMobile,
      colors,
      monoFamily
    );

    const timerState = useTimerStore.getState();
    const currentTick = timerState.presentationValue;
    const firstVisible = Math.max(
      0,
      (scrollPosition - playheadPosition) / pixelsPerUnit - 120
    );
    const lastVisible =
      (scrollPosition + (isMobile ? size.width : size.height) - playheadPosition) /
        pixelsPerUnit +
      120;
    const chordFont = `700 ${isMobile ? 13 : 14}px ${fontFamily}`;
    ctx.font = chordFont;

    const firstChordIndex = lowerBoundChord(chordsData, firstVisible);
    for (
      let chordIndex = firstChordIndex;
      chordIndex < chordsData.length;
      chordIndex += 1
    ) {
      const chord = chordsData[chordIndex];
      if (chord.tick > lastVisible) break;
      const previewTick =
        dragPreviewRef.current !== null && dragRef.current?.chord.tick === chord.tick
          ? dragPreviewRef.current
          : chord.tick;
      const position =
        playheadPosition + previewTick * pixelsPerUnit - scrollPosition;
      const nextChord = chordsData[chordIndex + 1];
      const current =
        currentTick >= chord.tick &&
        (nextChord === undefined || currentTick < nextChord.tick);
      const blockSize = isMobile
        ? clamp(
            (nextChord ? nextChord.tick - chord.tick : 600) * pixelsPerUnit - 8,
            54,
            150
          )
        : Math.max(46, Math.min(74, (nextChord ? nextChord.tick - chord.tick : 240) * pixelsPerUnit - 8));
      const left = isMobile ? position + 4 : RULER_SIZE;
      const top = isMobile ? RULER_SIZE + 4 : position + 4;
      const right = isMobile ? position + blockSize - 4 : size.width - 8;
      const bottom = isMobile ? size.height - 8 : position + blockSize - 4;

      if (right <= left || bottom <= top) continue;
      ctx.fillStyle = current ? colors.active : colors.chord;
      ctx.strokeStyle = current ? colors.active : colors.chordBorder;
      ctx.lineWidth = current ? 2 : 1;
      roundedRect(ctx, left, top, right - left, bottom - top, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = current ? "#ffffff" : colors.text;
      ctx.font = chordFont;
      ctx.fillText(chord.chord, (left + right) / 2, (top + bottom) / 2);

      hitBoxesRef.current.push({ chord, left, top, right, bottom });
    }

    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;
    if (isMobile) {
      ctx.beginPath();
      ctx.moveTo(0, RULER_SIZE);
      ctx.lineTo(size.width, RULER_SIZE);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(RULER_SIZE, 0);
      ctx.lineTo(RULER_SIZE, size.height);
      ctx.stroke();
    }

    ctx.strokeStyle = colors.playhead;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (isMobile) {
      ctx.moveTo(playheadPosition, 0);
      ctx.lineTo(playheadPosition, size.height);
    } else {
      ctx.moveTo(0, playheadPosition);
      ctx.lineTo(size.width, playheadPosition);
    }
    ctx.stroke();

    const plusX = isMobile ? playheadPosition : size.width / 2;
    const plusY = isMobile ? size.height / 2 : playheadPosition;
    ctx.fillStyle = colors.panel;
    ctx.beginPath();
    ctx.arc(plusX, plusY, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = colors.playhead;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = colors.playhead;
    ctx.beginPath();
    ctx.moveTo(plusX - 7, plusY);
    ctx.lineTo(plusX + 7, plusY);
    ctx.moveTo(plusX, plusY - 7);
    ctx.lineTo(plusX, plusY + 7);
    ctx.stroke();

    dirtyRef.current = false;
  }, [
    chordsData,
    getScrollPosition,
    isMobile,
    mode,
    pixelsPerUnit,
    playheadPosition,
    ppq,
    totalDuration,
    zoom,
  ]);

  useEffect(() => {
    drawRef.current = draw;
    markDirty();
  }, [draw, markDirty]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const scroll = scrollContainerRef.current;
    if (!canvas || !container || !scroll) return;
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    scroll.addEventListener("scroll", markDirty, { passive: true });
    return () => {
      observer.disconnect();
      scroll.removeEventListener("scroll", markDirty);
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    };
  }, [markDirty, resize]);

  useEffect(() => {
    markDirty();
  }, [chordsData, isMobile, markDirty, mode, zoom]);

  useEffect(() => {
    let lastDrawAt = Number.NEGATIVE_INFINITY;
    const unsubscribeTimer = useTimerStore.subscribe((next, previous) => {
      if (next.presentationValue === previous.presentationValue) return;
      const now = performance.now();
      // The chord lane is a navigation aid. Ten visual updates per second are
      // smooth enough while avoiding a full ruler/text repaint at display Hz.
      if (now - lastDrawAt < 100) return;
      lastDrawAt = now;
      markDirty();
    });
    const unsubscribeEditor = useKaraokeStore.subscribe((next, previous) => {
      if (
        next.isChordPanelAutoScrolling !== previous.isChordPanelAutoScrolling ||
        next.selectedChord !== previous.selectedChord ||
        next.suggestedChordTick !== previous.suggestedChordTick
      ) {
        markDirty();
      }
    });
    return () => {
      unsubscribeTimer();
      unsubscribeEditor();
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [markDirty]);

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (useKaraokeStore.getState().isChordPanelAutoScrolling) return;
      const scrollPosition = isMobile
        ? event.currentTarget.scrollLeft
        : event.currentTarget.scrollTop;
      const newTick = Math.max(0, scrollPosition / pixelsPerUnit);
      actions.setChordPanelCenterTick(newTick);
      actions.setPlayFromScrolledPosition(true);
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = setTimeout(() => playerControls?.seek(newTick), 150);
    },
    [actions, isMobile, pixelsPerUnit, playerControls]
  );

  const interruptAutoScroll = useCallback(() => {
    if (useKaraokeStore.getState().isChordPanelAutoScrolling) {
      actions.setIsChordPanelAutoScrolling(false);
    }
  }, [actions]);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLCanvasElement>) => {
      const scroll = scrollContainerRef.current;
      if (!scroll) return;
      interruptAutoScroll();
      event.preventDefault();
      if (isMobile) {
        scroll.scrollLeft += event.deltaX || event.deltaY;
      } else {
        scroll.scrollTop += event.deltaY || event.deltaX;
      }
    },
    [interruptAutoScroll, isMobile]
  );

  const handleAddChordAtPlayhead = useCallback(() => {
    const currentTime = playerControls?.getCurrentTime() ?? 0;
    const centerTick = useKaraokeStore.getState().chordPanelCenterTick;
    const tickValue = useKaraokeStore.getState().isChordPanelAutoScrolling
      ? currentTime
      : centerTick;
    actions.openChordModal(
      undefined,
      mode === "midi" ? Math.round(Math.max(0, tickValue)) : Math.max(0, tickValue)
    );
  }, [actions, mode, playerControls]);

  const chordAtPoint = useCallback((x: number, y: number) => {
    return [...hitBoxesRef.current]
      .reverse()
      .find((box) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom);
  }, []);

  const isPlusAtPoint = useCallback(
    (x: number, y: number) => {
      const plusX = isMobile ? playheadPosition : containerSize.width / 2;
      const plusY = isMobile ? containerSize.height / 2 : playheadPosition;
      return Math.hypot(x - plusX, y - plusY) <= 20;
    },
    [containerSize.height, containerSize.width, isMobile, playheadPosition]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hit = chordAtPoint(x, y);
      if (!hit) {
        const scroll = scrollContainerRef.current;
        if (event.pointerType === "touch" && scroll) {
          scrollGestureRef.current = {
            x: event.clientX,
            y: event.clientY,
            left: scroll.scrollLeft,
            top: scroll.scrollTop,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        return;
      }
      dragRef.current = {
        chord: hit.chord,
        startPosition: isMobile ? x : y,
        moved: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [chordAtPoint, isMobile]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      if (!drag) {
        const gesture = scrollGestureRef.current;
        const scroll = scrollContainerRef.current;
        if (gesture && scroll) {
          if (isMobile) {
            scroll.scrollLeft = gesture.left - (event.clientX - gesture.x);
          } else {
            scroll.scrollTop = gesture.top - (event.clientY - gesture.y);
          }
        }
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const position = isMobile ? event.clientX - rect.left : event.clientY - rect.top;
      const delta = position - drag.startPosition;
      if (Math.abs(delta) > 3) drag.moved = true;
      if (!drag.moved) return;
      dragPreviewRef.current = Math.max(0, drag.chord.tick + delta / pixelsPerUnit);
      markDirty();
    },
    [isMobile, markDirty, pixelsPerUnit]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const drag = dragRef.current;
      dragRef.current = null;
      dragPreviewRef.current = null;
      scrollGestureRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      markDirty();
      if (drag?.moved) {
        const delta = (isMobile ? x : y) - drag.startPosition;
        const newTick = Math.max(0, drag.chord.tick + delta / pixelsPerUnit);
        actions.updateChord(drag.chord.tick, {
          ...drag.chord,
          tick: mode === "midi" ? Math.round(newTick) : newTick,
        });
        return;
      }
      if (isPlusAtPoint(x, y)) {
        handleAddChordAtPlayhead();
        return;
      }
      const hit = chordAtPoint(x, y);
      if (hit) {
        actions.setIsChordPanelAutoScrolling(true);
        playerControls?.seek(hit.chord.tick);
        if (!playerControls?.isPlaying()) playerControls?.play();
      }
    },
    [
      actions,
      chordAtPoint,
      handleAddChordAtPlayhead,
      isMobile,
      isPlusAtPoint,
      markDirty,
      mode,
      pixelsPerUnit,
      playerControls,
    ]
  );

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const hit = chordAtPoint(event.clientX - rect.left, event.clientY - rect.top);
      if (hit) actions.openChordModal(hit.chord);
    },
    [actions, chordAtPoint]
  );

  const scrollContainerClasses = isMobile
    ? "absolute inset-0 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    : "absolute inset-0 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

  return (
    <div className="h-full flex flex-row lg:flex-col gap-2 overflow-hidden">
      <ChordEditModal />
      <ZoomControl isMobile={isMobile} zoom={zoom} setZoom={setZoom} />
      <div className="relative flex-grow h-full">
        <AutoScroller
          containerRef={scrollContainerRef}
          pixelsPerTick={pixelsPerUnit}
          playheadPosition={playheadPosition}
          isMobile={isMobile}
        />
        <ManualScroller
          containerRef={scrollContainerRef}
          pixelsPerTick={pixelsPerUnit}
          playheadPosition={playheadPosition}
          isMobile={isMobile}
        />
        <div
          ref={containerRef}
          className="h-full w-full bg-panel border border-line rounded-lg relative overflow-hidden"
          onMouseEnter={() => actions.setIsChordPanelHovered(true)}
          onMouseLeave={() => actions.setIsChordPanelHovered(false)}
        >
          <div
            ref={scrollContainerRef}
            className={scrollContainerClasses}
            onScroll={handleScroll}
            onTouchStart={interruptAutoScroll}
          >
            <div
              style={
                isMobile
                  ? {
                      display: "flex",
                      height: "100%",
                      width: `${trackSize + playheadPosition * 2}px`,
                    }
                  : {
                      paddingTop: `${playheadPosition}px`,
                      paddingBottom: `${playheadPosition}px`,
                      height: `${trackSize + playheadPosition * 2}px`,
                      width: "100%",
                    }
              }
            >
              {isMobile && <div style={{ width: playheadPosition, flexShrink: 0 }} />}
              <div
                style={
                  isMobile
                    ? { width: trackSize, height: "100%", flexShrink: 0 }
                    : { height: trackSize, width: "100%" }
                }
              />
              {isMobile && <div style={{ width: playheadPosition, flexShrink: 0 }} />}
            </div>
          </div>
          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-10 block h-full w-full cursor-pointer touch-none"
            style={{ fontFamily: "var(--font-lyrics)" }}
            aria-label="Chord timeline canvas"
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDoubleClick={handleDoubleClick}
          />
        </div>
      </div>
    </div>
  );
};

function drawRuler(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scrollPosition: number,
  playheadPosition: number,
  pixelsPerUnit: number,
  totalDuration: number,
  mode: string,
  ppq: number,
  zoom: number,
  isMobile: boolean,
  colors: { line: string; strongLine: string; muted: string },
  monoFamily: string
) {
  const intervals = getIntervals(mode, ppq, zoom);
  const viewLength = isMobile ? width : height;
  const first = Math.max(0, (scrollPosition - playheadPosition) / pixelsPerUnit);
  const last = Math.min(
    totalDuration || Number.MAX_SAFE_INTEGER,
    (scrollPosition + viewLength - playheadPosition) / pixelsPerUnit
  );
  const start = Math.floor(first / intervals.minor) * intervals.minor;

  ctx.textAlign = "center";
  ctx.font = `600 9px ${monoFamily}`;
  for (let value = start; value <= last; value += intervals.minor) {
    const position = playheadPosition + value * pixelsPerUnit - scrollPosition;
    const isMajor = Math.abs(value / intervals.major - Math.round(value / intervals.major)) < 1e-6;
    ctx.strokeStyle = isMajor ? colors.strongLine : colors.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (isMobile) {
      ctx.moveTo(position, 0);
      ctx.lineTo(position, isMajor ? 18 : 10);
    } else {
      ctx.moveTo(0, position);
      ctx.lineTo(isMajor ? 18 : 10, position);
    }
    ctx.stroke();
    if (isMajor) {
      ctx.fillStyle = colors.muted;
      const label = mode === "midi" ? formatTickLabel(value, zoom) : `${formatTickLabel(value, zoom)}s`;
      if (isMobile) ctx.fillText(label, position, 26);
      else {
        ctx.save();
        ctx.translate(26, position);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }
    }
  }
}

function lowerBoundChord(chords: ChordEvent[], tick: number): number {
  let low = 0;
  let high = chords.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (chords[middle].tick < tick) low = middle + 1;
    else high = middle;
  }
  return low;
}

function getIntervals(mode: string, ppq: number, zoom: number) {
  if (mode === "midi") {
    if (zoom > 2) return { major: ppq / 2, minor: ppq / 4 };
    if (zoom > 0.5) return { major: ppq, minor: ppq / 2 };
    if (zoom > 0.2) return { major: ppq * 2, minor: ppq };
    return { major: ppq * 4, minor: ppq * 2 };
  }
  if (zoom > 5) return { major: 1, minor: 0.5 };
  if (zoom > 2.5) return { major: 2, minor: 1 };
  if (zoom > 0.75) return { major: 5, minor: 1 };
  if (zoom > 0.3) return { major: 20, minor: 10 };
  if (zoom > 0.1) return { major: 60, minor: 30 };
  if (zoom > 0.025) return { major: 300, minor: 120 };
  if (zoom > 0.008) return { major: 900, minor: 300 };
  return { major: 3600, minor: 1800 };
}

function formatTickLabel(value: number, zoom: number) {
  if (zoom < 0.5 && value >= 1000) return `${Math.round(value / 1000)}k`;
  if (zoom < 1 && value >= 1000) return `${(value / 1000).toFixed(1).replace(".0", "")}k`;
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

export default ChordsBlock;
