"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  ChordEvent,
  IMidiParseResult,
  MidiEvent,
  TimeSignatureEvent,
} from "@/lib/karaoke/midi/types";
import { resizeCanvas, roundedRect } from "@/lib/canvas/runtime";
import { findChordForRange } from "@/lib/karaoke/chords/lookup";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { useTimerStore } from "@/timer-worker/store";
import { usePlayerSetupStore } from "@/hooks/usePlayerSetup";

interface MidiNote {
  id: string;
  key: number;
  velocity: number;
  start: number;
  end: number;
}

interface MeasureRow {
  measure: number;
  start: number;
  end: number;
  numerator: number;
  denominator: number;
  notes: MidiNote[];
}

interface PitchRange {
  low: number;
  high: number;
}

interface MidiNotesPreviewProps {
  onClose: () => void;
  overview?: boolean;
}

type PreviewOrientation = "vertical" | "horizontal";

const OVERVIEW_RENDER_SCALE = 0.95;

interface ActiveBeat {
  measure: number;
  beat: number;
}

interface BeatHit {
  node: BeatLayout;
  action: "play" | "expand";
}

interface BeatVisualOverride {
  beat: ActiveBeat;
  nodeKey: string;
  until: number;
  ready: boolean;
}

interface PreviewRowLayout {
  row: MeasureRow;
  top: number;
  left: number;
  width: number;
  height: number;
  beats: BeatLayout[];
}

interface BeatLayout {
  key: string;
  label: string;
  row: MeasureRow;
  start: number;
  end: number;
  depth: number;
  top: number;
  left: number;
  width: number;
  height: number;
  children: BeatLayout[];
}

interface PreviewLayout {
  orientation: PreviewOrientation;
  width: number;
  height: number;
  headerHeight: number;
  noteWidth: number;
  rows: PreviewRowLayout[];
  contentWidth: number;
  contentHeight: number;
}

interface CanvasTheme {
  panel: string;
  panel2: string;
  line: string;
  lineSoft: string;
  lineStrong: string;
  textMuted: string;
  brand: string;
  chord: string;
  playing: string;
}

interface PreviewLayoutCacheEntry {
  key: string;
  expandedBeatKeys: ReadonlySet<string>;
  layout: PreviewLayout;
}

// The spacer, resize observer, hit testing, and canvas draw can all ask for
// the same layout during one React update. Keep the last layout for a MIDI
// document so that those callers share the result instead of rebuilding the
// complete beat tree repeatedly.
const previewLayoutCache = new WeakMap<MeasureRow[], PreviewLayoutCacheEntry>();

interface MidiPreviewViewport {
  /** Normalized position of the editor's visible window along its scroll axis. */
  start: number;
  /** Normalized size of the editor's visible window along its scroll axis. */
  size: number;
}

const MIDI_PREVIEW_VIEWPORT_EVENT = "next-lyr:midi-preview-viewport";
const MIDI_PREVIEW_EXPANSION_EVENT = "next-lyr:midi-preview-expansion";
const MIDI_PREVIEW_SCROLL_REQUEST_EVENT = "next-lyr:midi-preview-scroll-request";
let latestMidiPreviewViewport: MidiPreviewViewport = {
  start: 0,
  size: 1,
};
let latestMidiPreviewExpandedKeys: ReadonlySet<string> = new Set();

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function getMidiPreviewViewport(): MidiPreviewViewport {
  return latestMidiPreviewViewport;
}

function requestMidiPreviewScroll(start: number): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ start: number }>(MIDI_PREVIEW_SCROLL_REQUEST_EVENT, {
      detail: { start: clamp01(start) },
    })
  );
}

function getMidiPreviewExpandedKeys(): ReadonlySet<string> {
  return latestMidiPreviewExpandedKeys;
}

function publishMidiPreviewExpandedKeys(
  expandedKeys: ReadonlySet<string>
): void {
  latestMidiPreviewExpandedKeys = new Set(expandedKeys);
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ReadonlySet<string>>(MIDI_PREVIEW_EXPANSION_EVENT, {
      detail: latestMidiPreviewExpandedKeys,
    })
  );
}

function publishMidiPreviewViewport(
  scroll: HTMLDivElement,
  orientation: PreviewOrientation
): void {
  const scrollSize =
    orientation === "vertical" ? scroll.scrollHeight : scroll.scrollWidth;
  const viewportSize =
    orientation === "vertical" ? scroll.clientHeight : scroll.clientWidth;
  const scrollPosition =
    orientation === "vertical" ? scroll.scrollTop : scroll.scrollLeft;
  const safeScrollSize = Math.max(1, scrollSize);
  const size = clamp01(viewportSize / safeScrollSize);
  const start = clamp01(scrollPosition / safeScrollSize);

  latestMidiPreviewViewport = { start, size };
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<MidiPreviewViewport>(MIDI_PREVIEW_VIEWPORT_EVENT, {
      detail: latestMidiPreviewViewport,
    })
  );
}

const MidiNotesEditor: React.FC<MidiNotesPreviewProps> = ({ onClose }) => {
  const midi = useKaraokeStore((state) => state.playerState.midi);
  const chordsData = useKaraokeStore((state) => state.chordsData);
  const playerControls = usePlayerSetupStore(
    (state) => state.playerControls
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layoutRef = useRef<PreviewLayout | null>(null);
  const layoutMeasuresRef = useRef<MeasureRow[] | null>(null);
  const layoutExpandedKeysRef = useRef<ReadonlySet<string> | null>(null);
  const sizeRef = useRef({ width: 1, height: 1, dpr: 1 });
  const themeRef = useRef<CanvasTheme | null>(null);
  const cursorRef = useRef({
    tick: 0,
    updatedAt: 0,
    bpm: 120,
    running: false,
  });
  const activeBeatRef = useRef<ActiveBeat>({
    measure: 1,
    beat: 1,
  });
  const beatVisualOverrideRef = useRef<BeatVisualOverride | null>(null);
  const beatNavigationRef = useRef(0);
  const hoveredNodeKeyRef = useRef<string | null>(null);
  const drawFrameRef = useRef<number | null>(null);
  const cursorFrameRef = useRef<number | null>(null);
  const drawRef = useRef<(cursorTick?: number) => void>(() => undefined);
  const [orientation, setOrientation] =
    useState<PreviewOrientation>("vertical");
  const [expandedBeatKeys, setExpandedBeatKeys] = useState<Set<string>>(
    () => new Set()
  );
  const expandedBeatKeysRef = useRef<ReadonlySet<string>>(new Set());

  const notes = useMemo(() => (midi ? extractMidiNotes(midi) : []), [midi]);
  const measures = useMemo(
    () => (midi ? buildMeasureRows(midi, notes) : []),
    [midi, notes]
  );
  const pitchRange = useMemo(() => getPitchRange(notes), [notes]);

  const markDirty = React.useCallback(() => {
    if (drawFrameRef.current !== null) return;
    drawFrameRef.current = requestAnimationFrame(() => {
      drawFrameRef.current = null;
      drawRef.current(cursorRef.current.tick);
    });
  }, []);

  const toggleBeatExpanded = React.useCallback((node: BeatLayout) => {
    setExpandedBeatKeys((previous) => {
      const next = new Set(previous);
      // Keep hit-testing and the next playback click on the same tree even
      // before React has committed the following render. This is especially
      // important when a user expands a beat and immediately clicks a child.
      expandedBeatKeysRef.current = next;
      if (next.has(node.key)) next.delete(node.key);
      else next.add(node.key);
      expandedBeatKeysRef.current = next;
      return next;
    });
  }, []);

  const handleBeatClick = React.useCallback(
    async (node: BeatLayout) => {
      if (!midi || !playerControls) return;

      const targetTick = Math.round(node.start);
      const request = ++beatNavigationRef.current;
      const rootBeat = Number(node.label.split(".")[0]) || 1;
      const targetBeat = { measure: node.row.measure, beat: rootBeat };

      // The compensated presentation clock can briefly report the beat before
      // the requested one after a direct seek. Keep the clicked beat visible
      // until the timer confirms that the seek has landed there.
      activeBeatRef.current = targetBeat;
      beatVisualOverrideRef.current = {
        beat: targetBeat,
        nodeKey: node.key,
        until: targetTick,
        ready: false,
      };
      cursorRef.current = {
        ...cursorRef.current,
        tick: targetTick,
        updatedAt: performance.now(),
      };
      const scroll = scrollRef.current;
      if (scroll) {
        if (orientation === "vertical") {
          const target =
            node.top + node.height / 2 - scroll.clientHeight / 2;
          scroll.scrollTo({
            top: Math.max(
              0,
              Math.min(target, scroll.scrollHeight - scroll.clientHeight)
            ),
            behavior: "smooth",
          });
        } else {
          const target =
            node.left + node.width / 2 - scroll.clientWidth / 2;
          scroll.scrollTo({
            left: Math.max(
              0,
              Math.min(target, scroll.scrollWidth - scroll.clientWidth)
            ),
            behavior: "smooth",
          });
        }
      }
      markDirty();
      useKaraokeStore.getState().actions.setPlayFromScrolledPosition(true);

      try {
        // The player owns the atomic seek: while playing it silences the old
        // schedule and re-arms at a future buffer boundary; while stopped it
        // only moves the paused position. This click never starts playback.
        await Promise.resolve(playerControls.seek(targetTick));
        if (request !== beatNavigationRef.current) return;
        if (beatVisualOverrideRef.current?.beat === targetBeat) {
          beatVisualOverrideRef.current.ready = true;
        }
      } catch (error) {
        console.error("Unable to start MIDI beat:", error);
      }
    },
    [markDirty, midi, orientation, playerControls]
  );

  const draw = React.useCallback(
    (cursorTick = cursorRef.current.tick) => {
      const canvas = canvasRef.current;
      const scroll = scrollRef.current;
      if (!canvas || !scroll) return;

      const { width, height, dpr } = sizeRef.current;
      const currentExpandedBeatKeys = expandedBeatKeysRef.current;
      let layout = layoutRef.current;
      if (
        !layout ||
        layout.orientation !== orientation ||
        layout.width !== width ||
        layout.height !== height ||
        layoutMeasuresRef.current !== measures ||
        layoutExpandedKeysRef.current !== currentExpandedBeatKeys
      ) {
        layout = getPreviewLayout(
          measures,
          orientation,
          width,
          height,
          currentExpandedBeatKeys
        );
        layoutRef.current = layout;
        layoutMeasuresRef.current = measures;
        layoutExpandedKeysRef.current = currentExpandedBeatKeys;
      }
      const theme = themeRef.current ?? readCanvasTheme();
      themeRef.current = theme;

      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = theme.panel;
      ctx.fillRect(0, 0, width, height);

      if (measures.length === 0) {
        ctx.fillStyle = theme.textMuted;
        ctx.font = "500 13px sans-serif";
        ctx.fillText("ไม่พบ MIDI note", 16, 28);
        return;
      }

      const scrollTop = scroll.scrollTop;
      const scrollLeft = scroll.scrollLeft;
      const active = activeBeatRef.current;
      const hovered = hoveredNodeKeyRef.current;
      const visualOverride = beatVisualOverrideRef.current;
      const cursorRunning = cursorRef.current.running;

      if (orientation === "vertical") {
        drawVerticalPreview(
          ctx,
          layout,
          scrollTop,
          active,
          hovered,
          cursorTick,
          cursorRunning,
          visualOverride,
          pitchRange,
          chordsData,
          theme
        );
      } else {
        drawHorizontalPreview(
          ctx,
          layout,
          scrollLeft,
          active,
          hovered,
          cursorTick,
          cursorRunning,
          visualOverride,
          pitchRange,
          chordsData,
          theme
        );
      }
    },
    [chordsData, measures, orientation, pitchRange]
  );

  drawRef.current = draw;

  // Changing the expanded tree does not change the canvas element's size, so
  // ResizeObserver is not guaranteed to fire. Explicitly schedule a paint or
  // the new +/- state would only become visible after mouse movement.
  useEffect(() => {
    markDirty();
  }, [expandedBeatKeys, markDirty]);

  useEffect(() => {
    publishMidiPreviewExpandedKeys(expandedBeatKeys);
  }, [expandedBeatKeys]);

  useEffect(() => {
    const handleScrollRequest = (event: Event) => {
      const request = (event as CustomEvent<{ start: number }>).detail;
      const scroll = scrollRef.current;
      if (!scroll || !request) return;

      if (orientation === "vertical") {
        const maxScroll = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
        const nextScrollTop = clamp01(request.start) * maxScroll;
        if (Math.abs(scroll.scrollTop - nextScrollTop) > 0.5) {
          scroll.scrollTop = nextScrollTop;
        }
      } else {
        const maxScroll = Math.max(0, scroll.scrollWidth - scroll.clientWidth);
        const nextScrollLeft = clamp01(request.start) * maxScroll;
        if (Math.abs(scroll.scrollLeft - nextScrollLeft) > 0.5) {
          scroll.scrollLeft = nextScrollLeft;
        }
      }
    };

    window.addEventListener(
      MIDI_PREVIEW_SCROLL_REQUEST_EVENT,
      handleScrollRequest
    );
    return () =>
      window.removeEventListener(
        MIDI_PREVIEW_SCROLL_REQUEST_EVENT,
        handleScrollRequest
      );
  }, [orientation]);

  const resize = React.useCallback(() => {
    const canvas = canvasRef.current;
    const scroll = scrollRef.current;
    if (!canvas || !scroll) return;

    const nextOrientation: PreviewOrientation = "vertical";
    if (nextOrientation !== orientation) {
      setOrientation(nextOrientation);
      return;
    }

    canvas.style.width = `${Math.max(1, scroll.clientWidth)}px`;
    canvas.style.height = `${Math.max(1, scroll.clientHeight)}px`;
    sizeRef.current = resizeCanvas(canvas);
    layoutRef.current = getPreviewLayout(
      measures,
      orientation,
      sizeRef.current.width,
      sizeRef.current.height,
      expandedBeatKeys
    );
    layoutMeasuresRef.current = measures;
    layoutExpandedKeysRef.current = expandedBeatKeys;
    publishMidiPreviewViewport(scroll, orientation);
    markDirty();
  }, [expandedBeatKeys, markDirty, measures, orientation]);

  const handleScroll = React.useCallback(() => {
    const scroll = scrollRef.current;
    if (scroll) publishMidiPreviewViewport(scroll, orientation);
    markDirty();
  }, [markDirty, orientation]);

  const getBeatAtPoint = React.useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>): BeatHit | null => {
      const canvas = canvasRef.current;
      const scroll = scrollRef.current;
      let layout = layoutRef.current;
      const currentExpandedBeatKeys = expandedBeatKeysRef.current;
      if (!canvas || !scroll || !layout) return null;

      if (
        layoutMeasuresRef.current !== measures ||
        layoutExpandedKeysRef.current !== currentExpandedBeatKeys ||
        layout.orientation !== orientation ||
        layout.width !== sizeRef.current.width ||
        layout.height !== sizeRef.current.height
      ) {
        layout = getPreviewLayout(
          measures,
          orientation,
          sizeRef.current.width,
          sizeRef.current.height,
          currentExpandedBeatKeys
        );
        layoutRef.current = layout;
        layoutMeasuresRef.current = measures;
        layoutExpandedKeysRef.current = currentExpandedBeatKeys;
      }

      const rect = canvas.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      const position =
        orientation === "vertical"
          ? localY + scroll.scrollTop
          : localX + scroll.scrollLeft;
      const controlNode = findExpandControl(
        layout,
        orientation,
        orientation === "vertical" ? localX : position,
        orientation === "vertical" ? position : localY
      );
      if (controlNode) return { node: controlNode, action: "expand" };

      const rowLayout = layout.rows.find((candidate) =>
        orientation === "vertical"
          ? position >= candidate.top &&
            position < candidate.top + candidate.height
          : position >= candidate.left &&
            position < candidate.left + candidate.width
      );
      if (!rowLayout) return null;

      const node = findDeepestBeat(
        rowLayout.beats,
        position,
        orientation
      );
      return node ? { node, action: "play" } : null;
    },
    [measures, orientation]
  );

  const handleCanvasClick = React.useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const hit = getBeatAtPoint(event);
      if (!hit) return;

      if (hit.action === "expand") toggleBeatExpanded(hit.node);
      else void handleBeatClick(hit.node);
    },
    [getBeatAtPoint, handleBeatClick, toggleBeatExpanded]
  );

  const handleCanvasMouseMove = React.useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const hit = getBeatAtPoint(event);
      const next = hit?.node.key ?? null;
      const previous = hoveredNodeKeyRef.current;
      if (previous === next) {
        return;
      }

      hoveredNodeKeyRef.current = next;
      markDirty();
    },
    [getBeatAtPoint, markDirty]
  );

  const handleCanvasMouseLeave = React.useCallback(() => {
    if (hoveredNodeKeyRef.current === null) return;
    hoveredNodeKeyRef.current = null;
    markDirty();
  }, [markDirty]);

  useEffect(() => {
    const initial = useTimerStore.getState();
    const initialBeat = {
      measure: initial.beatInfo.measure,
      beat: initial.beatInfo.beat,
    };
    activeBeatRef.current = initialBeat;

    return useTimerStore.subscribe((next, previous) => {
      if (
        next.beatInfo.measure !== previous.beatInfo.measure ||
        next.beatInfo.beat !== previous.beatInfo.beat
      ) {
        const override = beatVisualOverrideRef.current;
        if (
          override &&
          (!override.ready ||
            next.presentationValue < override.until ||
            next.beatInfo.measure !== override.beat.measure ||
            next.beatInfo.beat !== override.beat.beat)
        ) {
          activeBeatRef.current = override.beat;
          markDirty();
          return;
        }
        beatVisualOverrideRef.current = null;
        const nextBeat = {
          measure: next.beatInfo.measure,
          beat: next.beatInfo.beat,
        };
        activeBeatRef.current = nextBeat;
        markDirty();
      }
    });
  }, [markDirty]);

  useEffect(() => {
    const scrollToCursor = (tick: number) => {
      const scroll = scrollRef.current;
      const layout = layoutRef.current;
      if (!scroll || !layout) return;

      const row = layout.rows.find(
        (candidate) => candidate.row.measure === activeBeatRef.current.measure
      );
      if (!row) return;
      const span = Math.max(1, row.row.end - row.row.start);
      const progress = Math.max(
        0,
        Math.min(1, (tick - row.row.start) / span)
      );

      if (orientation === "vertical") {
        const cursorPosition = row.top + progress * row.height;
        const target = cursorPosition - scroll.clientHeight / 2;
        const nextScrollTop = Math.max(
          0,
          Math.min(target, scroll.scrollHeight - scroll.clientHeight)
        );
        if (Math.abs(scroll.scrollTop - nextScrollTop) > 0.5) {
          scroll.scrollTop = nextScrollTop;
          publishMidiPreviewViewport(scroll, orientation);
        }
      } else {
        const cursorPosition = row.left + progress * row.width;
        const target = cursorPosition - scroll.clientWidth / 2;
        const nextScrollLeft = Math.max(
          0,
          Math.min(target, scroll.scrollWidth - scroll.clientWidth)
        );
        if (Math.abs(scroll.scrollLeft - nextScrollLeft) > 0.5) {
          scroll.scrollLeft = nextScrollLeft;
          publishMidiPreviewViewport(scroll, orientation);
        }
      }
    };

    let frame: number | null = null;
    let pendingTick = useTimerStore.getState().presentationValue;
    const requestFollow = (tick: number) => {
      pendingTick = tick;
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        scrollToCursor(pendingTick);
        markDirty();
      });
    };

    requestFollow(pendingTick);
    const unsubscribe = useTimerStore.subscribe((next, previous) => {
      if (
        next.presentationValue !== previous.presentationValue ||
        next.beatInfo.measure !== previous.beatInfo.measure ||
        next.beatInfo.beat !== previous.beatInfo.beat
      ) {
        requestFollow(next.presentationValue);
      }
    });

    return () => {
      unsubscribe();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [markDirty, measures.length, orientation]);

  useEffect(() => {
    resize();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [resize]);

  useEffect(() => {
    const syncCursor = (snapshot: ReturnType<typeof useTimerStore.getState>) => {
      cursorRef.current = {
        tick: snapshot.presentationValue,
        updatedAt: performance.now(),
        bpm: snapshot.bpm,
        running: snapshot.presentationRunning,
      };
      markDirty();
    };

    const renderCursor = (now: number) => {
      cursorFrameRef.current = null;
      const cursor = cursorRef.current;
      const predictedTick = cursor.running
        ? cursor.tick +
          ((now - cursor.updatedAt) / 1000) *
            (Math.max(1, midi?.ticksPerBeat ?? 480) * Math.max(1, cursor.bpm)) /
            60
        : cursor.tick;
      drawRef.current(predictedTick);
      if (cursor.running) {
        cursorFrameRef.current = requestAnimationFrame(renderCursor);
      }
    };

    const startCursor = () => {
      if (cursorFrameRef.current === null && cursorRef.current.running) {
        cursorFrameRef.current = requestAnimationFrame(renderCursor);
      }
    };

    syncCursor(useTimerStore.getState());
    startCursor();
    const unsubscribe = useTimerStore.subscribe((next, previous) => {
      if (
        next.presentationValue !== previous.presentationValue ||
        next.bpm !== previous.bpm ||
        next.presentationRunning !== previous.presentationRunning
      ) {
        syncCursor(next);
        startCursor();
      }
    });

    return () => {
      unsubscribe();
      if (cursorFrameRef.current !== null) {
        cancelAnimationFrame(cursorFrameRef.current);
        cursorFrameRef.current = null;
      }
    };
  }, [markDirty, midi?.ticksPerBeat]);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      themeRef.current = readCanvasTheme();
      markDirty();
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [markDirty]);

  useEffect(() => {
    return () => {
      if (drawFrameRef.current !== null) {
        cancelAnimationFrame(drawFrameRef.current);
      }
      if (cursorFrameRef.current !== null) {
        cancelAnimationFrame(cursorFrameRef.current);
      }
    };
  }, []);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-line bg-panel">
      <header className="grid shrink-0 grid-cols-2 border-b border-line bg-lane text-center text-[11px] font-semibold text-foreground">
        <span className="border-r border-line px-3 py-2">MIDI Notes</span>
        <span className="px-3 py-2">Chord</span>
      </header>

      {!midi ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
          โหลด MIDI เพื่อดูโน้ต
        </div>
      ) : (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={`relative min-h-0 flex-1 overscroll-contain [scrollbar-width:thin] ${
            orientation === "vertical"
              ? "overflow-y-auto overflow-x-hidden"
              : "overflow-x-auto overflow-y-hidden"
          }`}
        >
          <div
            className="relative"
            style={getPreviewSpacerStyle(
              measures,
              orientation,
              scrollRef.current?.clientWidth ?? 1,
              scrollRef.current?.clientHeight ?? 1,
              expandedBeatKeys
            )}
          >
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
              className="sticky left-0 top-0 z-10 block h-full w-full cursor-pointer"
              aria-label="MIDI notes and chord preview"
            />
          </div>
        </div>
      )}
    </section>
  );
};

const MidiNotesOverview: React.FC = () => {
  const midi = useKaraokeStore((state) => state.playerState.midi);
  const chordsData = useKaraokeStore((state) => state.chordsData);
  const playerControls = usePlayerSetupStore(
    (state) => state.playerControls
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef({ width: 1, height: 1, dpr: 1 });
  const frameRef = useRef<number | null>(null);
  const cursorFrameRef = useRef<number | null>(null);
  const dirtyRef = useRef(true);
  const pendingSeekRef = useRef<number | null>(null);
  const dragTickRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const didDragRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const dragCenterOffsetRef = useRef(0.5);
  const viewportRef = useRef<MidiPreviewViewport>(getMidiPreviewViewport());
  const expandedBeatKeysRef = useRef<ReadonlySet<string>>(
    getMidiPreviewExpandedKeys()
  );
  const drawRef = useRef<() => void>(() => undefined);
  const cursorRef = useRef({
    tick: 0,
    updatedAt: 0,
    bpm: 120,
    running: false,
  });

  const notes = useMemo(() => (midi ? extractMidiNotes(midi) : []), [midi]);
  const measures = useMemo(
    () => (midi ? buildMeasureRows(midi, notes) : []),
    [midi, notes]
  );
  const pitchRange = useMemo(() => getPitchRange(notes), [notes]);
  const totalTicks = Math.max(
    1,
    midi?.duration ?? 0,
    notes[notes.length - 1]?.end ?? 0
  );

  const markDirty = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      drawRef.current();
    });
  }, []);

  const getCurrentTick = useCallback(() => {
    if (dragTickRef.current !== null) return dragTickRef.current;
    const cursor = cursorRef.current;
    if (!cursor.running) return cursor.tick;
    return (
      cursor.tick +
      ((performance.now() - cursor.updatedAt) / 1000) *
        (Math.max(1, midi?.ticksPerBeat ?? 480) * Math.max(1, cursor.bpm)) /
        60
    );
  }, [midi?.ticksPerBeat]);

  const flushSeek = useCallback(() => {
    const target = pendingSeekRef.current;
    pendingSeekRef.current = null;
    if (target === null || !playerControls) return;

    useKaraokeStore.getState().actions.setPlayFromScrolledPosition(true);
    void Promise.resolve(playerControls.seek(target))
      .then(() => {
        if (!draggingRef.current && dragTickRef.current === target) {
          dragTickRef.current = null;
          markDirty();
        }
      })
      .catch((error) => {
        console.error("Unable to seek MIDI overview:", error);
      });
  }, [markDirty, playerControls]);

  const getTickFromPointer = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return 0;
      const rect = canvas.getBoundingClientRect();
      const horizontal = false;
      const point = horizontal
        ? event.clientX - rect.left
        : event.clientY - rect.top;
      const length = horizontal ? rect.width : rect.height;
      return Math.max(
        0,
        Math.min(1, (point - 4) / Math.max(1, length - 8))
      ) * totalTicks;
    },
    [totalTicks]
  );

  const updatePointer = useCallback(
    (
      event: React.PointerEvent<HTMLCanvasElement>,
      commit = false,
      syncEditorScroll = false
    ) => {
      const target = getTickFromPointer(event);
      dragTickRef.current = target;
      const viewportSize = viewportRef.current.size;
      viewportRef.current = {
        start: Math.min(
          clamp01(target / totalTicks - dragCenterOffsetRef.current),
          Math.max(0, 1 - viewportSize)
        ),
        size: viewportSize,
      };
      if (syncEditorScroll) {
        requestMidiPreviewScroll(viewportRef.current.start);
      }
      markDirty();
      if (commit) {
        pendingSeekRef.current = target;
        flushSeek();
      }
    },
    [flushSeek, getTickFromPointer, markDirty]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const { width, height, dpr } = sizeRef.current;
    const horizontal = false;
    const theme = readCanvasTheme();
    const currentTick = Math.max(
      0,
      Math.min(totalTicks, getCurrentTick())
    );
    const noteRatio = horizontal
      ? 0.61
      : width >= 1024
        ? 0.34
        : 0.44;
    const noteWidth = horizontal ? width : Math.max(1, width * noteRatio);
    const noteHeight = horizontal ? Math.max(1, height * noteRatio) : height;
    const chordStart = horizontal ? noteHeight : noteWidth;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = theme.panel;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = theme.panel2;
    if (horizontal) {
      ctx.fillRect(0, chordStart, width, height - chordStart);
    } else {
      ctx.fillRect(chordStart, 0, width - chordStart, height);
    }

    ctx.strokeStyle = theme.lineStrong;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(0, chordStart + 0.5);
      ctx.lineTo(width, chordStart + 0.5);
    } else {
      ctx.moveTo(chordStart + 0.5, 0);
      ctx.lineTo(chordStart + 0.5, height);
    }
    ctx.stroke();

    ctx.fillStyle = theme.textMuted;
    ctx.font = "600 8px sans-serif";
    ctx.textAlign = "left";
    if (horizontal) {
      ctx.fillText("Chord", 4, chordStart + 10);
    } else {
      ctx.fillText("Chord", chordStart + 4, 10);
    }

    const count = Math.max(1, measures.length);
    const rowGuideStep = Math.max(1, Math.ceil(count / 48));
    measures.forEach((row, index) => {
      const active = currentTick >= row.start && currentTick <= row.end;
      if (horizontal) {
        const x = (index / count) * width;
        const rowWidth = width / count;
        drawHorizontalNoteRoll(
          ctx,
          row,
          x,
          0,
          rowWidth,
          noteHeight,
          active,
          null,
          null,
          x,
          currentTick,
          pitchRange,
          theme,
          true
        );
        if (index % rowGuideStep === 0) {
          ctx.strokeStyle = theme.line;
          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.moveTo(Math.round(x + rowWidth) + 0.5, 0);
          ctx.lineTo(Math.round(x + rowWidth) + 0.5, height);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        drawOverviewExpandedBeatTree(
          ctx,
          row,
          true,
          x,
          rowWidth,
          noteHeight,
          height,
          expandedBeatKeysRef.current,
          theme.line
        );
        drawOverviewChordBlocks(
          ctx,
          row,
          true,
          x,
          rowWidth,
          noteHeight,
          height - noteHeight,
          currentTick,
          chordsData,
          theme
        );
      } else {
        const y = (index / count) * height;
        const rowHeight = height / count;
        drawVerticalNoteRoll(
          ctx,
          row,
          0,
          y,
          noteWidth,
          rowHeight,
          active,
          null,
          null,
          y,
          currentTick,
          pitchRange,
          theme,
          true
        );
        if (index % rowGuideStep === 0) {
          ctx.strokeStyle = theme.line;
          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.moveTo(0, Math.round(y + rowHeight) + 0.5);
          ctx.lineTo(width, Math.round(y + rowHeight) + 0.5);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        drawOverviewExpandedBeatTree(
          ctx,
          row,
          false,
          0,
          y,
          noteWidth,
          rowHeight,
          expandedBeatKeysRef.current,
          theme.line
        );
        drawOverviewChordBlocks(
          ctx,
          row,
          false,
          noteWidth,
          rowHeight,
          y,
          width - noteWidth,
          currentTick,
          chordsData,
          theme
        );
      }
    });

    if (measures.length === 0) {
      ctx.fillStyle = theme.textMuted;
      ctx.font = "500 9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No MIDI notes", width / 2, height / 2);
    }

    const viewport = viewportRef.current;
    const viewportAxisSize = horizontal ? width : height;
    const viewportSize = Math.max(
      2 / Math.max(1, viewportAxisSize),
      clamp01(viewport.size)
    );
    const viewportStart = Math.min(
      clamp01(viewport.start),
      Math.max(0, 1 - viewportSize)
    );
    const viewportPoint = viewportStart * viewportAxisSize;
    const viewportLength = Math.min(
      viewportAxisSize - viewportPoint,
      viewportSize * viewportAxisSize
    );
    ctx.fillStyle = "rgba(120, 170, 255, 0.1)";
    if (horizontal) {
      ctx.fillRect(viewportPoint, 0, Math.max(2, viewportLength), height);
    } else {
      ctx.fillRect(0, viewportPoint, width, Math.max(2, viewportLength));
    }
    ctx.strokeStyle = theme.brand;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      horizontal ? viewportPoint + 0.5 : 0.5,
      horizontal ? 0.5 : viewportPoint + 0.5,
      horizontal
        ? Math.max(2, viewportLength - 1)
        : Math.max(1, width - 1),
      horizontal
        ? Math.max(1, height - 1)
        : Math.max(2, viewportLength - 1)
    );

    const cursorPoint =
      4 + (currentTick / totalTicks) * Math.max(1, (horizontal ? width : height) - 8);
    ctx.strokeStyle = theme.playing;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(Math.round(cursorPoint) + 0.5, 0);
      ctx.lineTo(Math.round(cursorPoint) + 0.5, height);
    } else {
      ctx.moveTo(0, Math.round(cursorPoint) + 0.5);
      ctx.lineTo(width, Math.round(cursorPoint) + 0.5);
    }
    ctx.stroke();
    dirtyRef.current = false;
  }, [chordsData, getCurrentTick, measures, pitchRange, totalTicks]);

  drawRef.current = draw;

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // The overview is intentionally softer than the editor. It is a map of
    // the document, not a second place to inspect individual notes.
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
  }, [chordsData, markDirty, measures, pitchRange, totalTicks]);

  useEffect(() => {
    viewportRef.current = getMidiPreviewViewport();
    const handleViewport = (event: Event) => {
      const viewport = (event as CustomEvent<MidiPreviewViewport>).detail;
      if (!viewport) return;
      viewportRef.current = viewport;
      markDirty();
    };

    window.addEventListener(MIDI_PREVIEW_VIEWPORT_EVENT, handleViewport);
    return () =>
      window.removeEventListener(MIDI_PREVIEW_VIEWPORT_EVENT, handleViewport);
  }, [markDirty]);

  useEffect(() => {
    expandedBeatKeysRef.current = getMidiPreviewExpandedKeys();
    const handleExpansion = (event: Event) => {
      const expandedKeys = (event as CustomEvent<ReadonlySet<string>>).detail;
      if (!expandedKeys) return;
      expandedBeatKeysRef.current = expandedKeys;
      markDirty();
    };

    window.addEventListener(MIDI_PREVIEW_EXPANSION_EVENT, handleExpansion);
    return () =>
      window.removeEventListener(MIDI_PREVIEW_EXPANSION_EVENT, handleExpansion);
  }, [markDirty]);

  useEffect(() => {
    const animateCursor = () => {
      cursorFrameRef.current = null;
      if (!cursorRef.current.running) return;
      markDirty();
      cursorFrameRef.current = requestAnimationFrame(animateCursor);
    };
    const syncCursor = (snapshot: ReturnType<typeof useTimerStore.getState>) => {
      cursorRef.current = {
        tick: snapshot.presentationValue,
        updatedAt: performance.now(),
        bpm: snapshot.bpm,
        running: snapshot.presentationRunning,
      };
      markDirty();
      if (
        cursorRef.current.running &&
        cursorFrameRef.current === null
      ) {
        cursorFrameRef.current = requestAnimationFrame(animateCursor);
      }
    };

    syncCursor(useTimerStore.getState());
    const unsubscribe = useTimerStore.subscribe((next, previous) => {
      if (
        next.presentationValue !== previous.presentationValue ||
        next.bpm !== previous.bpm ||
        next.presentationRunning !== previous.presentationRunning
      ) {
        syncCursor(next);
      }
    });
    return () => {
      unsubscribe();
      if (cursorFrameRef.current !== null) {
        cancelAnimationFrame(cursorFrameRef.current);
        cursorFrameRef.current = null;
      }
    };
  }, [markDirty]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (cursorFrameRef.current !== null) {
        cancelAnimationFrame(cursorFrameRef.current);
      }
    };
  }, []);

  return (
    <section className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-md border border-line bg-panel">
      <canvas
        ref={canvasRef}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          draggingRef.current = true;
          didDragRef.current = false;
          dragCenterOffsetRef.current =
            clamp01(viewportRef.current.size) / 2;
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
          updatePointer(event, false, didDragRef.current);
        }}
        onPointerUp={(event) => {
          if (!draggingRef.current) return;
          updatePointer(event, !didDragRef.current, didDragRef.current);
          draggingRef.current = false;
          if (didDragRef.current) {
            // A drag is a minimap scroll only. Keep the real playhead and
            // timer untouched; the yellow marker was only a drag preview.
            dragTickRef.current = null;
          }
          didDragRef.current = false;
          dragCenterOffsetRef.current = 0.5;
          markDirty();
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
          didDragRef.current = false;
          dragCenterOffsetRef.current = 0.5;
          pendingSeekRef.current = null;
          dragTickRef.current = null;
          viewportRef.current = getMidiPreviewViewport();
          markDirty();
        }}
        className="block min-h-0 min-w-0 flex-1 cursor-crosshair touch-none"
        aria-label="MIDI notes overview. Click or drag to seek."
      />
    </section>
  );
};

const MidiNotesPreview: React.FC<MidiNotesPreviewProps> = ({
  onClose,
  overview = false,
}) => (overview ? <MidiNotesOverview /> : <MidiNotesEditor onClose={onClose} />);

function getPreviewLayout(
  measures: MeasureRow[],
  orientation: PreviewOrientation,
  width: number,
  height: number,
  expandedBeatKeys: ReadonlySet<string>
): PreviewLayout {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const cacheKey = `${orientation}:${safeWidth}:${safeHeight}`;
  const cached = previewLayoutCache.get(measures);
  if (
    cached?.key === cacheKey &&
    cached.expandedBeatKeys === expandedBeatKeys
  ) {
    return cached.layout;
  }

  const requiredSizeCache = new Map<string, number>();

  if (orientation === "horizontal") {
    const rowHeight = 200;
    let left = 0;
    const rows = measures.map((row) => {
      const beatCount = Math.max(1, row.numerator);
      const requiredWidths = Array.from({ length: beatCount }, (_, index) =>
        getRequiredBeatSize(
          row,
          [index + 1],
          expandedBeatKeys,
          55,
          requiredSizeCache
        )
      );
      const measureWidth = Math.max(
        220,
        requiredWidths.reduce((sum, value) => sum + value, 0)
      );
      let beatLeft = left;
      const beats = requiredWidths.map((_, index) => {
        const start =
          row.start + ((row.end - row.start) * index) / beatCount;
        const end =
          row.start + ((row.end - row.start) * (index + 1)) / beatCount;
        const node = buildBeatNode(
          row,
          [index + 1],
          start,
          end,
          0,
          beatLeft,
          55,
          rowHeight,
          expandedBeatKeys,
          "horizontal",
          55,
          requiredSizeCache
        );
        beatLeft += requiredWidths[index];
        return node;
      });
      const layout = {
        row,
        top: 0,
        left,
        width: measureWidth,
        height: rowHeight,
        beats,
      };
      left += measureWidth;
      return layout;
    });

    const layout = {
      orientation,
      width: safeWidth,
      height: safeHeight,
      headerHeight: 0,
      noteWidth: 0,
      rows,
      contentWidth: Math.max(safeWidth, left),
      contentHeight: Math.max(safeHeight, rowHeight),
    };
    previewLayoutCache.set(measures, {
      key: cacheKey,
      expandedBeatKeys,
      layout,
    });
    return layout;
  }

  const headerHeight = 30;
  const noteRatio = safeWidth >= 1024 ? 0.34 : 0.44;
  const noteWidth = safeWidth * noteRatio;
  let top = headerHeight;
  const rows = measures.map((row) => {
    const beatCount = Math.max(1, row.numerator);
    const requiredHeights = Array.from({ length: beatCount }, (_, index) =>
      getRequiredBeatSize(
        row,
        [index + 1],
        expandedBeatKeys,
        34,
        requiredSizeCache
      )
    );
    const rowHeight = Math.max(
      88,
      requiredHeights.reduce((sum, value) => sum + value, 0)
    );
    let beatTop = top;
    const beats = requiredHeights.map((_, index) => {
        const start =
          row.start + ((row.end - row.start) * index) / beatCount;
      const end =
        row.start + ((row.end - row.start) * (index + 1)) / beatCount;
      const node = buildBeatNode(
        row,
        [index + 1],
        start,
        end,
        beatTop,
        0,
        safeWidth,
        34,
        expandedBeatKeys,
        "vertical",
        34,
        requiredSizeCache
      );
      beatTop += requiredHeights[index];
      return node;
    });
    const layout = {
      row,
      top,
      left: 0,
      width: safeWidth,
      height: rowHeight,
      beats,
    };
    top += rowHeight;
    return layout;
  });

  const layout = {
    orientation,
    width: safeWidth,
    height: safeHeight,
    headerHeight,
    noteWidth,
    rows,
    contentWidth: safeWidth,
    contentHeight: Math.max(safeHeight, top),
  };
  previewLayoutCache.set(measures, {
    key: cacheKey,
    expandedBeatKeys,
    layout,
  });
  return layout;
}

function getBeatKey(row: MeasureRow, path: number[]): string {
  return `${row.start}:${path.join(".")}`;
}

function getRequiredBeatSize(
  row: MeasureRow,
  path: number[],
  expandedBeatKeys: ReadonlySet<string>,
  minimum: number,
  cache: Map<string, number>
): number {
  const key = `${minimum}:${getBeatKey(row, path)}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  if (!expandedBeatKeys.has(getBeatKey(row, path))) {
    cache.set(key, minimum);
    return minimum;
  }

  const size = minimum +
    Array.from({ length: 4 }, (_, index) =>
      getRequiredBeatSize(
        row,
        [...path, index + 1],
        expandedBeatKeys,
        minimum,
        cache
      )
    ).reduce((sum, value) => sum + value, 0);
  cache.set(key, size);
  return size;
}

function buildBeatNode(
  row: MeasureRow,
  path: number[],
  start: number,
  end: number,
  top: number,
  left: number,
  width: number,
  height: number,
  expandedBeatKeys: ReadonlySet<string>,
  orientation: PreviewOrientation,
  cellSize: number,
  requiredSizeCache: Map<string, number>
): BeatLayout {
  const key = getBeatKey(row, path);
  const node: BeatLayout = {
    key,
    label: path.join("."),
    row,
    start,
    end,
    depth: path.length - 1,
    top,
    left,
    width,
    height,
    children: [],
  };

  if (!expandedBeatKeys.has(key)) return node;

  const children: BeatLayout[] = [];
  let childTop = top + height;
  let childLeft = left + width;
  for (let index = 0; index < 4; index += 1) {
    const childPath = [...path, index + 1];
    const childStart = start + ((end - start) * index) / 4;
    const childEnd = start + ((end - start) * (index + 1)) / 4;
    const child =
      orientation === "vertical"
        ? buildBeatNode(
            row,
            childPath,
            childStart,
            childEnd,
            childTop,
            left,
            width,
            cellSize,
            expandedBeatKeys,
            orientation,
            cellSize,
            requiredSizeCache
          )
        : buildBeatNode(
            row,
            childPath,
            childStart,
            childEnd,
            top,
            childLeft,
            cellSize,
            height,
            expandedBeatKeys,
            orientation,
            cellSize,
            requiredSizeCache
          );
    children.push(child);
    if (orientation === "vertical") {
      childTop += getRequiredBeatSize(
        row,
        childPath,
        expandedBeatKeys,
        cellSize,
        requiredSizeCache
      );
    } else {
      childLeft += getRequiredBeatSize(
        row,
        childPath,
        expandedBeatKeys,
        cellSize,
        requiredSizeCache
      );
    }
  }
  node.children = children;
  return node;
}

function findDeepestBeat(
  nodes: BeatLayout[],
  position: number,
  orientation: PreviewOrientation
): BeatLayout | null {
  const node = nodes.find((candidate) =>
    orientation === "vertical"
      ? position >= candidate.top &&
        position < getNodeAxisEnd(candidate, orientation)
      : position >= candidate.left &&
        position < getNodeAxisEnd(candidate, orientation)
  );
  if (!node) return null;

  return node.children.length > 0
    ? findDeepestBeat(node.children, position, orientation) ?? node
    : node;
}

function findBeatNodeByKey(
  nodes: BeatLayout[],
  key: string
): BeatLayout | null {
  for (const node of nodes) {
    if (node.key === key) return node;
    const child = findBeatNodeByKey(node.children, key);
    if (child) return child;
  }
  return null;
}

function getLocalBeatLabel(node: BeatLayout): string {
  const separator = node.label.lastIndexOf(".");
  return separator >= 0 ? node.label.slice(separator + 1) : node.label;
}

function getActivePreviewNode(
  rowLayout: PreviewRowLayout,
  activeBeat: ActiveBeat,
  cursorTick: number,
  cursorRunning: boolean,
  visualOverride: BeatVisualOverride | null
): BeatLayout | null {
  if (rowLayout.row.measure !== activeBeat.measure) return null;

  const beatIndex = Math.max(
    0,
    Math.min(rowLayout.beats.length - 1, activeBeat.beat - 1)
  );
  const fallback = rowLayout.beats[beatIndex] ?? null;
  const overrideNode =
    visualOverride?.beat.measure === rowLayout.row.measure
      ? findBeatNodeByKey(rowLayout.beats, visualOverride.nodeKey)
      : null;

  // A compensated seek can report the previous tick for a short time. Keep
  // the exact clicked node visible until the presentation clock reaches the
  // requested tick. When stopped, keep it selected at the seek position.
  if (
    visualOverride &&
    overrideNode &&
    (!visualOverride.ready || !cursorRunning || cursorTick < visualOverride.until)
  ) {
    return overrideNode;
  }

  return findDeepestNodeAtTick(rowLayout.beats, cursorTick) ?? fallback;
}

/**
 * Resolve the visible measure/beat from the same cursor that drives the note
 * roll. The timer beat event is intentionally low-frequency and can be one
 * message behind after a direct seek. Relying on that event alone leaves the
 * selected measure painted forever even though the audio cursor has moved on.
 */
function getPreviewActiveBeat(
  layout: PreviewLayout,
  fallback: ActiveBeat,
  cursorTick: number,
  cursorRunning: boolean,
  visualOverride: BeatVisualOverride | null
): ActiveBeat {
  if (
    visualOverride &&
    (!visualOverride.ready || !cursorRunning || cursorTick < visualOverride.until)
  ) {
    return visualOverride.beat;
  }

  if (!cursorRunning) return fallback;

  const row = layout.rows.find(
    (candidate) =>
      cursorTick >= candidate.row.start &&
      (cursorTick < candidate.row.end ||
        candidate === layout.rows[layout.rows.length - 1])
  );
  if (!row || row.beats.length === 0) return fallback;

  const span = Math.max(1, row.row.end - row.row.start);
  const beat = Math.min(
    row.beats.length,
    Math.max(1, Math.floor(((cursorTick - row.row.start) / span) * row.beats.length) + 1)
  );
  return { measure: row.row.measure, beat };
}

function getNodeAxisEnd(
  node: BeatLayout,
  orientation: PreviewOrientation
): number {
  if (node.children.length === 0) {
    return orientation === "vertical"
      ? node.top + node.height
      : node.left + node.width;
  }
  return getNodeAxisEnd(node.children[node.children.length - 1], orientation);
}

function findDeepestNodeAtTick(
  nodes: BeatLayout[],
  tick: number
): BeatLayout | null {
  const node = nodes.find(
    (candidate) =>
      tick >= candidate.start &&
      (tick < candidate.end ||
        (candidate === nodes[nodes.length - 1] && tick <= candidate.end))
  );
  if (!node) return null;
  return node.children.length > 0
    ? findDeepestNodeAtTick(node.children, tick) ?? node
    : node;
}

function getExpandControlRect(
  layout: PreviewLayout,
  node: BeatLayout,
  orientation: PreviewOrientation
): { left: number; top: number; right: number; bottom: number } {
  const size = 16;
  if (orientation === "vertical") {
    // Vertical/mobile mode stacks every depth underneath the parent. Add a
    // small, capped tree indent so the branch remains visible without ever
    // pushing the controls toward the right edge of the screen.
    const visualDepth = Math.min(node.depth, 3);
    const left = Math.min(
      layout.width - size - 3,
      layout.noteWidth + 4 + visualDepth * 14
    );
    return {
      left,
      top: node.top + 3,
      right: left + size,
      bottom: node.top + 3 + size,
    };
  }

  const left = node.left + 3;
  const top = 102 + node.depth * 15;
  return { left, top, right: left + size, bottom: top + size };
}

function findExpandControl(
  layout: PreviewLayout,
  orientation: PreviewOrientation,
  x: number,
  y: number
): BeatLayout | null {
  const nodes: BeatLayout[] = [];
  const visit = (items: BeatLayout[]) => {
    for (const node of items) {
      nodes.push(node);
      visit(node.children);
    }
  };
  for (const row of layout.rows) visit(row.beats);

  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index];
    const rect = getExpandControlRect(layout, node, orientation);
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return node;
    }
  }
  return null;
}

function drawBeatTree(
  ctx: CanvasRenderingContext2D,
  layout: PreviewLayout,
  nodes: BeatLayout[],
  orientation: PreviewOrientation,
  scrollOffset: number,
  activeNodeKey: string | null,
  hoveredNodeKey: string | null,
  chords: readonly ChordEvent[],
  theme: CanvasTheme
): void {
  for (const node of nodes) {
    drawBeatNode(
      ctx,
      layout,
      node,
      orientation,
      scrollOffset,
      activeNodeKey,
      hoveredNodeKey,
      chords,
      theme
    );
  }
}

function drawBeatNode(
  ctx: CanvasRenderingContext2D,
  layout: PreviewLayout,
  node: BeatLayout,
  orientation: PreviewOrientation,
  scrollOffset: number,
  activeNodeKey: string | null,
  hoveredNodeKey: string | null,
  chords: readonly ChordEvent[],
  theme: CanvasTheme
): void {
  const vertical = orientation === "vertical";
  const x = vertical ? layout.noteWidth : node.left - scrollOffset;
  const y = vertical ? node.top - scrollOffset : 124;
  const width = vertical ? layout.width - layout.noteWidth : node.width;
  const height = vertical ? node.height : Math.max(1, node.height - 124);
  const active = node.key === activeNodeKey;
  const hovered = node.key === hoveredNodeKey;
  const displayLabel = getLocalBeatLabel(node);

  // Expanded nodes used to skip this fill entirely, so hovering a nested
  // parent appeared to do nothing even though hit-testing found it. Highlight
  // every node that is active or hovered; only leaves keep the default fill.
  if (node.children.length === 0 || active || hovered) {
    ctx.fillStyle = active
      ? theme.playing
      : hovered
        ? theme.brand
        : node.depth % 2 === 0
          ? theme.panel2
          : theme.panel;
    ctx.globalAlpha = active ? 0.28 : hovered ? 0.16 : node.depth % 2 === 0 ? 0.2 : 1;
    ctx.fillRect(x, y, width, height);
    ctx.globalAlpha = 1;
  }

  if (node.children.length > 0) {
    for (const child of node.children) {
      drawBeatNode(
        ctx,
        layout,
        child,
        orientation,
        scrollOffset,
        activeNodeKey,
        hoveredNodeKey,
        chords,
        theme
      );
    }
  }

  if (vertical && node.children.length > 0) {
    drawVerticalTreeBranches(ctx, layout, node, scrollOffset, theme);
  }

  const chord = findChordForRange(chords, node.start, node.end)?.chord.trim();
  const chordEvent = findChordForRange(chords, node.start, node.end);
  const chordStartsAtNode = chordEvent?.tick === node.start;
  const isFirstChild = node.depth > 0 && getLocalBeatLabel(node) === "1";
  // A marker owns the first visible node whose start matches its real tick.
  // Keep that card on the parent when the parent is expanded; otherwise a
  // marker at 0 would incorrectly drift from `1` to `1.1` to `1.1.1`.
  const ownsChord =
    chord &&
    (node.children.length === 0 || chordStartsAtNode) &&
    !(isFirstChild && chordStartsAtNode);
  if (ownsChord) {
    drawMidiChordCard(
      ctx,
      chord,
      x + width / 2,
      y + height / 2,
      width,
      height,
      active ? theme.playing : hovered ? theme.brand : theme.chord,
      theme.panel2,
      active ? theme.playing : hovered ? theme.brand : theme.chord
    );
  }

  ctx.strokeStyle = node.children.length > 0 ? theme.lineStrong : theme.lineSoft;
  ctx.globalAlpha = node.children.length > 0 ? 0.7 : 0.9;
  ctx.strokeRect(
    Math.round(x) + 0.5,
    Math.round(y) + 0.5,
    Math.max(1, width - 1),
    Math.max(1, height - 1)
  );
  ctx.globalAlpha = 1;

  const control = getExpandControlRect(layout, node, orientation);
  const controlX = vertical ? control.left : control.left - scrollOffset;
  const controlY = vertical ? control.top - scrollOffset : control.top;

  // In stacked/vertical mode the beat number sits below its +/- control. It
  // keeps the tree gutter narrow even when the beat is expanded many levels.
  ctx.fillStyle = theme.textMuted;
  ctx.font = `${node.depth === 0 ? 600 : 500} 9px sans-serif`;
  if (vertical) {
    ctx.textAlign = "center";
    ctx.fillText(displayLabel, controlX + 8, controlY + 27);
    ctx.textAlign = "start";
  } else {
    ctx.fillText(displayLabel, x + 22, 137 + node.depth * 15);
  }

  ctx.fillStyle = hovered ? theme.brand : theme.panel2;
  ctx.globalAlpha = 0.95;
  ctx.fillRect(controlX, controlY, 16, 16);
  ctx.strokeStyle = theme.lineStrong;
  ctx.strokeRect(controlX + 0.5, controlY + 0.5, 15, 15);
  ctx.fillStyle = hovered ? theme.panel : theme.textMuted;
  ctx.font = "700 12px sans-serif";
  ctx.fillText(node.children.length > 0 ? "−" : "+", controlX + 4, controlY + 12);
  ctx.globalAlpha = 1;
}

function drawVerticalTreeBranches(
  ctx: CanvasRenderingContext2D,
  layout: PreviewLayout,
  node: BeatLayout,
  scrollOffset: number,
  theme: CanvasTheme
): void {
  const parentControl = getExpandControlRect(layout, node, "vertical");
  const parentX = parentControl.left + 8;
  const parentY = parentControl.top - scrollOffset + 8;
  const childControls = node.children.map((child) =>
    getExpandControlRect(layout, child, "vertical")
  );
  const childRailX = childControls[0].left - 2;
  const childYs = childControls.map(
    (control) => control.top - scrollOffset + 8
  );

  ctx.strokeStyle = theme.lineStrong;
  ctx.globalAlpha = 0.78;
  ctx.lineWidth = 1;
  ctx.beginPath();
  // Parent trunk to the child rail.
  ctx.moveTo(Math.round(parentX) + 0.5, Math.round(parentY) + 0.5);
  ctx.lineTo(Math.round(childRailX) + 0.5, Math.round(parentY) + 0.5);
  // One vertical rail shared by all four children.
  ctx.moveTo(Math.round(childRailX) + 0.5, Math.round(childYs[0]) + 0.5);
  ctx.lineTo(
    Math.round(childRailX) + 0.5,
    Math.round(childYs[childYs.length - 1]) + 0.5
  );
  // Small branches from the rail into each +/- control.
  for (const [index, control] of childControls.entries()) {
    const childY = childYs[index];
    ctx.moveTo(Math.round(childRailX) + 0.5, Math.round(childY) + 0.5);
    ctx.lineTo(Math.round(control.left) + 0.5, Math.round(childY) + 0.5);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.globalAlpha = 1;
}

function drawSubdivisionGuides(
  ctx: CanvasRenderingContext2D,
  nodes: BeatLayout[],
  orientation: PreviewOrientation,
  scrollOffset: number,
  topOffset: number,
  width: number,
  theme: CanvasTheme
): void {
  for (const node of nodes) {
    const position =
      orientation === "vertical"
        ? node.top - scrollOffset
        : node.left - scrollOffset;
    ctx.strokeStyle = node.depth === 0 ? theme.lineStrong : theme.lineSoft;
    ctx.globalAlpha = node.depth === 0 ? 0.8 : 0.55;
    ctx.beginPath();
    if (orientation === "vertical") {
      ctx.moveTo(0, Math.round(position) + 0.5);
      ctx.lineTo(width, Math.round(position) + 0.5);
    } else {
      ctx.moveTo(Math.round(position) + 0.5, topOffset);
      ctx.lineTo(Math.round(position) + 0.5, topOffset + 76);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    drawSubdivisionGuides(
      ctx,
      node.children,
      orientation,
      scrollOffset,
      topOffset,
      width,
      theme
    );
  }
}

function getPreviewSpacerStyle(
  measures: MeasureRow[],
  orientation: PreviewOrientation,
  width: number,
  height: number,
  expandedBeatKeys: ReadonlySet<string>
): React.CSSProperties {
  const layout = getPreviewLayout(
    measures,
    orientation,
    width,
    height,
    expandedBeatKeys
  );
  return orientation === "vertical"
    ? { height: layout.contentHeight, width: "100%" }
    : { height: layout.contentHeight, width: layout.contentWidth };
}

function readCanvasTheme(): CanvasTheme {
  const computed = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) =>
    computed.getPropertyValue(name).trim() || fallback;

  return {
    panel: read("--panel", "#171c24"),
    panel2: read("--panel-2", "#202a38"),
    line: read("--line", "#3a4a5e"),
    lineSoft: read("--line-soft", "#263342"),
    lineStrong: read("--line-strong", "#566a82"),
    textMuted: read("--text-muted", "#b4c0d0"),
    brand: read("--brand", "#78aaff"),
    chord: read("--chord", "#f4bd68"),
    playing: read("--lyric-playing", "#f6dc67"),
  };
}

function fitMidiCanvasText(
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

function drawVerticalPreview(
  ctx: CanvasRenderingContext2D,
  layout: PreviewLayout,
  scrollTop: number,
  activeBeat: ActiveBeat,
  hoveredNodeKey: string | null,
  cursorTick: number,
  cursorRunning: boolean,
  visualOverride: BeatVisualOverride | null,
  pitchRange: PitchRange,
  chords: readonly ChordEvent[],
  theme: CanvasTheme
): void {
  const headerY = layout.headerHeight - scrollTop;
  if (headerY + layout.headerHeight >= 0 && headerY <= layout.height) {
    ctx.fillStyle = theme.panel2;
    ctx.fillRect(0, headerY, layout.width, layout.headerHeight);
    ctx.fillStyle = theme.textMuted;
    ctx.font = "600 10px sans-serif";
    ctx.fillText("MIDI Notes", 8, headerY + 19);
    ctx.fillText("Chord", layout.noteWidth + 8, headerY + 19);
    ctx.strokeStyle = theme.line;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(0, Math.round(headerY + layout.headerHeight) + 0.5);
    ctx.lineTo(layout.width, Math.round(headerY + layout.headerHeight) + 0.5);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const resolvedActiveBeat = getPreviewActiveBeat(
    layout,
    activeBeat,
    cursorTick,
    cursorRunning,
    visualOverride
  );

  for (const rowLayout of layout.rows) {
    const y = rowLayout.top - scrollTop;
    if (y + rowLayout.height < 0 || y > layout.height) continue;

    const row = rowLayout.row;
    const active = row.measure === resolvedActiveBeat.measure;
    const activeNode = getActivePreviewNode(
      rowLayout,
      resolvedActiveBeat,
      cursorTick,
      cursorRunning,
      visualOverride
    );
    const hoveredNode = hoveredNodeKey
      ? findBeatNodeByKey(rowLayout.beats, hoveredNodeKey)
      : null;

    ctx.fillStyle = theme.panel;
    ctx.fillRect(0, y, layout.width, rowLayout.height);
    ctx.fillStyle = theme.panel2;
    ctx.globalAlpha = 0.2;
    ctx.fillRect(0, y, layout.noteWidth, rowLayout.height);
    ctx.globalAlpha = 1;

    drawVerticalNoteRoll(
      ctx,
      row,
      0,
      y,
      layout.noteWidth,
      rowLayout.height,
      active,
      activeNode,
      hoveredNode,
      rowLayout.top,
      cursorTick,
      pitchRange,
      theme
    );

    drawSubdivisionGuides(
      ctx,
      rowLayout.beats,
      "vertical",
      scrollTop,
      0,
      layout.noteWidth,
      theme
    );
    drawBeatTree(
      ctx,
      layout,
      rowLayout.beats,
      "vertical",
      scrollTop,
      activeNode?.key ?? null,
      hoveredNodeKey,
      chords,
      theme
    );

    ctx.fillStyle = theme.textMuted;
    ctx.font = "600 9px sans-serif";
    ctx.fillText(`M${row.measure}`, 4, y + 12);

    ctx.strokeStyle = theme.lineStrong;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(Math.round(layout.noteWidth) + 0.5, y);
    ctx.lineTo(Math.round(layout.noteWidth) + 0.5, y + rowLayout.height);
    ctx.moveTo(0, Math.round(y + rowLayout.height) + 0.5);
    ctx.lineTo(layout.width, Math.round(y + rowLayout.height) + 0.5);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawHorizontalPreview(
  ctx: CanvasRenderingContext2D,
  layout: PreviewLayout,
  scrollLeft: number,
  activeBeat: ActiveBeat,
  hoveredNodeKey: string | null,
  cursorTick: number,
  cursorRunning: boolean,
  visualOverride: BeatVisualOverride | null,
  pitchRange: PitchRange,
  chords: readonly ChordEvent[],
  theme: CanvasTheme
): void {
  const resolvedActiveBeat = getPreviewActiveBeat(
    layout,
    activeBeat,
    cursorTick,
    cursorRunning,
    visualOverride
  );

  for (const rowLayout of layout.rows) {
    const x = rowLayout.left - scrollLeft;
    if (x + rowLayout.width < 0 || x > layout.width) continue;

    const row = rowLayout.row;
    const active = row.measure === resolvedActiveBeat.measure;
    const activeNode = getActivePreviewNode(
      rowLayout,
      resolvedActiveBeat,
      cursorTick,
      cursorRunning,
      visualOverride
    );
    const hoveredNode = hoveredNodeKey
      ? findBeatNodeByKey(rowLayout.beats, hoveredNodeKey)
      : null;

    ctx.fillStyle = theme.panel;
    ctx.fillRect(x, 0, rowLayout.width, rowLayout.height);
    ctx.fillStyle = theme.panel2;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(x, 0, rowLayout.width, 24);
    ctx.globalAlpha = 1;

    ctx.fillStyle = theme.textMuted;
    ctx.font = "600 9px sans-serif";
    ctx.fillText(
      `M${row.measure} · ${row.numerator}/${row.denominator}`,
      x + 8,
      16
    );

    drawHorizontalNoteRoll(
      ctx,
      row,
      x,
      24,
      rowLayout.width,
      76,
      active,
      activeNode,
      hoveredNode,
      rowLayout.left,
      cursorTick,
      pitchRange,
      theme
    );

    ctx.fillStyle = theme.textMuted;
    ctx.font = "600 9px sans-serif";
    ctx.fillText("Chord", x + 23, 114);

    drawSubdivisionGuides(
      ctx,
      rowLayout.beats,
      "horizontal",
      scrollLeft,
      24,
      rowLayout.width,
      theme
    );
    drawBeatTree(
      ctx,
      layout,
      rowLayout.beats,
      "horizontal",
      scrollLeft,
      activeNode?.key ?? null,
      hoveredNodeKey,
      chords,
      theme
    );

    ctx.strokeStyle = theme.lineStrong;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(Math.round(x + rowLayout.width) + 0.5, 0);
    ctx.lineTo(Math.round(x + rowLayout.width) + 0.5, rowLayout.height);
    ctx.moveTo(x, 124.5);
    ctx.lineTo(x + rowLayout.width, 124.5);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawOverviewExpandedBeatTree(
  ctx: CanvasRenderingContext2D,
  row: MeasureRow,
  horizontal: boolean,
  axisStart: number,
  axisLength: number,
  crossStart: number,
  crossLength: number,
  expandedKeys: ReadonlySet<string>,
  color: string
): void {
  const beatCount = Math.max(1, row.numerator);
  const measureSpan = Math.max(1, row.end - row.start);

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;

  const drawNode = (
    path: number[],
    start: number,
    end: number,
    depth: number
  ) => {
    if (depth > 5 || !expandedKeys.has(getBeatKey(row, path))) return;

    const span = Math.max(1, end - start);
    ctx.globalAlpha = Math.max(0.25, 0.8 - depth * 0.1);
    for (let index = 1; index < 4; index += 1) {
      const point =
        axisStart + (((start + (span * index) / 4) - row.start) / measureSpan) * axisLength;
      ctx.beginPath();
      if (horizontal) {
        ctx.moveTo(Math.round(point) + 0.5, crossStart);
        ctx.lineTo(Math.round(point) + 0.5, crossStart + crossLength);
      } else {
        ctx.moveTo(crossStart, Math.round(point) + 0.5);
        ctx.lineTo(crossStart + crossLength, Math.round(point) + 0.5);
      }
      ctx.stroke();
    }

    const childSpan = span / 4;
    for (let index = 0; index < 4; index += 1) {
      const childStart = start + childSpan * index;
      drawNode(
        [...path, index + 1],
        childStart,
        childStart + childSpan,
        depth + 1
      );
    }
    ctx.globalAlpha = 1;
  };

  const beatSpan = measureSpan / beatCount;
  for (let index = 0; index < beatCount; index += 1) {
    const start = row.start + beatSpan * index;
    drawNode([index + 1], start, start + beatSpan, 0);
  }
  ctx.globalAlpha = 1;
}

function drawOverviewChordBlocks(
  ctx: CanvasRenderingContext2D,
  row: MeasureRow,
  horizontal: boolean,
  axisStart: number,
  axisLength: number,
  crossStart: number,
  crossLength: number,
  currentTick: number,
  chords: readonly ChordEvent[],
  theme: CanvasTheme
): void {
  const count = Math.max(1, row.numerator);
  const span = Math.max(1, row.end - row.start);
  const safeCrossLength = Math.max(1, crossLength);

  for (let index = 0; index < count; index += 1) {
    const start = row.start + (span * index) / count;
    const end = row.start + (span * (index + 1)) / count;
    const axis = axisStart + (axisLength * index) / count;
    const nextAxis = axisStart + (axisLength * (index + 1)) / count;
    const blockLength = Math.max(1, nextAxis - axis);
    const active =
      currentTick >= start &&
      (currentTick < end || (index === count - 1 && currentTick <= end));
    const chord = findChordForRange(chords, start, end)?.chord.trim();

    ctx.fillStyle = active ? theme.playing : theme.panel2;
    ctx.globalAlpha = active ? 0.2 : index % 2 === 0 ? 0.1 : 0.04;
    if (horizontal) {
      ctx.fillRect(axis, crossStart, blockLength, safeCrossLength);
    } else {
      ctx.fillRect(crossStart, axis, safeCrossLength, blockLength);
    }
    ctx.globalAlpha = 1;

    if (index > 0) {
      ctx.strokeStyle = theme.lineSoft;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      if (horizontal) {
        ctx.moveTo(Math.round(axis) + 0.5, crossStart);
        ctx.lineTo(Math.round(axis) + 0.5, crossStart + safeCrossLength);
      } else {
        ctx.moveTo(crossStart, Math.round(axis) + 0.5);
        ctx.lineTo(crossStart + safeCrossLength, Math.round(axis) + 0.5);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (chord) {
      drawMidiChordCard(
        ctx,
        chord,
        horizontal ? axis + blockLength / 2 : crossStart + safeCrossLength / 2,
        horizontal
          ? crossStart + safeCrossLength / 2
          : axis + blockLength / 2,
        horizontal ? blockLength : safeCrossLength,
        horizontal ? safeCrossLength : blockLength,
        active ? theme.playing : theme.chord,
        theme.panel2,
        active ? theme.playing : theme.chord
      );
    }
  }
}

function drawMidiChordCard(
  ctx: CanvasRenderingContext2D,
  label: string,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  accent: string,
  background: string,
  text: string
): void {
  if (width < 16 || height < 16) return;

  ctx.font = "700 11px sans-serif";
  const maxWidth = Math.max(1, width - 8);
  const maxCardWidth = Math.max(1, width - 6);
  const cardWidth = Math.min(
    maxCardWidth,
    Math.max(18, ctx.measureText(label).width + 12)
  );
  const cardHeight = Math.min(24, Math.max(16, height - 6));
  const cardX = centerX - cardWidth / 2;
  const cardY = centerY - cardHeight / 2;

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
  ctx.fillStyle = text;
  ctx.textAlign = "center";
  ctx.fillText(fitMidiCanvasText(ctx, label, maxWidth), centerX, centerY + 4);
  ctx.textAlign = "start";
}

function drawVerticalNoteRoll(
  ctx: CanvasRenderingContext2D,
  row: MeasureRow,
  x: number,
  y: number,
  width: number,
  height: number,
  active: boolean,
  activeNode: BeatLayout | null,
  hoveredNode: BeatLayout | null,
  rowTop: number,
  cursorTick: number,
  pitchRange: PitchRange,
  theme: CanvasTheme,
  lowDetail = false
): void {
  const span = Math.max(1, row.end - row.start);
  const pitchSpan = Math.max(12, pitchRange.high - pitchRange.low + 1);
  const usableWidth = Math.max(1, width - 4);
  const noteWidth = Math.max(
    lowDetail ? 1 : 2,
    Math.min(lowDetail ? 3 : 8, usableWidth / pitchSpan)
  );

  if (hoveredNode) {
    ctx.fillStyle = theme.brand;
    ctx.globalAlpha = 0.08;
    ctx.fillRect(x, y + hoveredNode.top - rowTop, width, hoveredNode.height);
    ctx.globalAlpha = 1;
  }

  if (activeNode) {
    ctx.fillStyle = theme.playing;
    ctx.globalAlpha = 0.13;
    ctx.fillRect(x, y + activeNode.top - rowTop, width, activeNode.height);
    ctx.globalAlpha = 1;
  }

  if (!lowDetail) {
    for (
      let pitch = Math.ceil(pitchRange.low / 12) * 12;
      pitch <= pitchRange.high;
      pitch += 12
    ) {
      const pitchX =
        x + 2 + ((pitch - pitchRange.low) / pitchSpan) * usableWidth;
      ctx.strokeStyle = theme.lineStrong;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.moveTo(Math.round(pitchX) + 0.5, y);
      ctx.lineTo(Math.round(pitchX) + 0.5, y + height);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  const noteStride = lowDetail
    ? Math.max(1, Math.ceil(row.notes.length / 24))
    : 1;
  for (let noteIndex = 0; noteIndex < row.notes.length; noteIndex += noteStride) {
    const note = row.notes[noteIndex];
    const noteStart = Math.max(row.start, note.start);
    const noteEnd = Math.min(row.end, Math.max(note.start + 1, note.end));
    if (noteEnd <= noteStart) continue;
    const noteY = y + ((noteStart - row.start) / span) * height;
    const noteHeight = Math.max(1.5, ((noteEnd - noteStart) / span) * height);
    const pitchX = x + 2 + ((note.key - pitchRange.low) / pitchSpan) * usableWidth;
    const noteX = pitchX - noteWidth / 2;

    ctx.fillStyle = theme.brand;
    ctx.globalAlpha = lowDetail ? 0.58 : 0.9;
    ctx.fillRect(noteX, noteY, noteWidth, noteHeight);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(noteX, noteY, Math.min(1, noteWidth), noteHeight);
    ctx.globalAlpha = 1;
  }

  if (active && cursorTick >= row.start && cursorTick <= row.end) {
    const cursorY = y + ((cursorTick - row.start) / span) * height;
    ctx.strokeStyle = theme.playing;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, Math.round(cursorY) + 0.5);
    ctx.lineTo(x + width, Math.round(cursorY) + 0.5);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function drawHorizontalNoteRoll(
  ctx: CanvasRenderingContext2D,
  row: MeasureRow,
  x: number,
  y: number,
  width: number,
  height: number,
  active: boolean,
  activeNode: BeatLayout | null,
  hoveredNode: BeatLayout | null,
  rowLeft: number,
  cursorTick: number,
  pitchRange: PitchRange,
  theme: CanvasTheme,
  lowDetail = false
): void {
  const span = Math.max(1, row.end - row.start);
  const pitchSpan = Math.max(12, pitchRange.high - pitchRange.low + 1);
  const top = 4;
  const usableHeight = Math.max(1, height - top - 6);
  const noteHeight = Math.max(
    lowDetail ? 1 : 2,
    Math.min(lowDetail ? 3 : 6, usableHeight / pitchSpan)
  );

  if (hoveredNode) {
    ctx.fillStyle = theme.brand;
    ctx.globalAlpha = 0.08;
    ctx.fillRect(x + hoveredNode.left - rowLeft, y, hoveredNode.width, height);
    ctx.globalAlpha = 1;
  }

  if (activeNode) {
    ctx.fillStyle = theme.playing;
    ctx.globalAlpha = 0.13;
    ctx.fillRect(x + activeNode.left - rowLeft, y, activeNode.width, height);
    ctx.globalAlpha = 1;
  }

  if (!lowDetail) {
    for (
      let pitch = Math.ceil(pitchRange.low / 12) * 12;
      pitch <= pitchRange.high;
      pitch += 12
    ) {
      const pitchY =
        y +
        top +
        usableHeight -
          ((pitch - pitchRange.low) / pitchSpan) * usableHeight;
      ctx.strokeStyle = theme.lineStrong;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.moveTo(x, Math.round(pitchY) + 0.5);
      ctx.lineTo(x + width, Math.round(pitchY) + 0.5);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  const noteStride = lowDetail
    ? Math.max(1, Math.ceil(row.notes.length / 24))
    : 1;
  for (let noteIndex = 0; noteIndex < row.notes.length; noteIndex += noteStride) {
    const note = row.notes[noteIndex];
    const noteStart = Math.max(row.start, note.start);
    const noteEnd = Math.min(row.end, Math.max(note.start + 1, note.end));
    if (noteEnd <= noteStart) continue;
    const noteX = x + ((noteStart - row.start) / span) * width;
    const noteWidth = Math.max(1.5, ((noteEnd - noteStart) / span) * width);
    const noteY =
      y +
      top +
      usableHeight -
        ((note.key - pitchRange.low) / pitchSpan) * usableHeight -
        noteHeight / 2;

    ctx.fillStyle = theme.brand;
    ctx.globalAlpha = lowDetail ? 0.58 : 0.9;
    ctx.fillRect(noteX, noteY, noteWidth, noteHeight);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(noteX, noteY, noteWidth, Math.min(1, noteHeight));
    ctx.globalAlpha = 1;
  }

  if (active && cursorTick >= row.start && cursorTick <= row.end) {
    const cursorX = x + ((cursorTick - row.start) / span) * width;
    ctx.strokeStyle = theme.playing;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.round(cursorX) + 0.5, y);
    ctx.lineTo(Math.round(cursorX) + 0.5, y + height);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function extractMidiNotes(midi: IMidiParseResult): MidiNote[] {
  const result: MidiNote[] = [];
  const open = new Map<string, MidiNote[]>();
  const duration = Math.max(1, midi.duration);

  midi.tracks.forEach((track, trackIndex) => {
    track.forEach((event: MidiEvent, eventIndex) => {
      if (event.type !== "channel") return;
      const message = event.status & 0xf0;
      const key = event.data[0];
      const velocity = event.data[1] ?? 0;
      if (!Number.isFinite(key) || key < 0 || key > 127) return;

      const noteKey = `${trackIndex}:${event.status & 0x0f}:${key}`;
      if (message === 0x90 && velocity > 0) {
        const note: MidiNote = {
          id: `${noteKey}:${eventIndex}`,
          key,
          velocity,
          start: event.absoluteTime,
          end: duration,
        };
        const queue = open.get(noteKey) ?? [];
        queue.push(note);
        open.set(noteKey, queue);
        return;
      }

      if (message !== 0x80 && !(message === 0x90 && velocity === 0)) return;
      const queue = open.get(noteKey);
      const note = queue?.shift();
      if (!note) return;
      note.end = Math.max(note.start + 1, event.absoluteTime);
      result.push(note);
    });
  });

  for (const queue of open.values()) result.push(...queue);
  return result.sort((a, b) => a.start - b.start || a.key - b.key);
}

function getPitchRange(notes: MidiNote[]): PitchRange {
  if (notes.length === 0) return { low: 36, high: 84 };

  let low = 127;
  let high = 0;
  for (const note of notes) {
    low = Math.min(low, note.key);
    high = Math.max(high, note.key);
  }

  return {
    low: Math.max(0, Math.floor(Math.max(0, low - 2) / 12) * 12),
    high: Math.min(127, Math.ceil(Math.min(127, high + 2) / 12) * 12 - 1),
  };
}

function buildMeasureRows(midi: IMidiParseResult, notes: MidiNote[]): MeasureRow[] {
  const signatures = normalizeTimeSignatures(midi.timeSignatures);
  const duration = Math.max(
    1,
    midi.duration,
    ...notes.map((note) => note.end)
  );
  const signatureMeasures = getSignatureStartMeasures(
    signatures,
    Math.max(1, midi.ticksPerBeat)
  );
  const rows: MeasureRow[] = [];
  let tick = 0;
  let guard = 0;

  while (tick < duration && guard < 10000) {
    guard += 1;
    let signatureIndex = 0;
    for (let index = 1; index < signatures.length; index += 1) {
      if (signatures[index].tick > tick) break;
      signatureIndex = index;
    }

    const signature = signatures[signatureIndex];
    const ppq = Math.max(1, midi.ticksPerBeat);
    const measureLength =
      ppq * (4 / Math.max(1, signature.denominator)) *
      Math.max(1, signature.numerator);
    const segmentEnd = signatures[signatureIndex + 1]?.tick ?? duration;
    const start = Math.max(
      tick,
      signature.tick +
        Math.floor(Math.max(0, tick - signature.tick) / measureLength) *
          measureLength
    );
    const end = Math.min(start + measureLength, segmentEnd, duration);
    if (end <= tick) break;

    const measure =
      signatureMeasures[signatureIndex] +
      Math.floor(Math.max(0, start - signature.tick) / measureLength);
    rows.push({
      measure,
      start,
      end,
      numerator: Math.max(1, signature.numerator),
      denominator: Math.max(1, signature.denominator),
      notes: notes.filter(
        (note) => note.start < end && note.end > start
      ),
    });
    tick = end;
  }

  return rows;
}

function normalizeTimeSignatures(
  signatures: TimeSignatureEvent[]
): TimeSignatureEvent[] {
  const sorted = [...signatures].sort((a, b) => a.tick - b.tick);
  if (sorted.length === 0 || sorted[0].tick > 0) {
    sorted.unshift({ tick: 0, numerator: 4, denominator: 4 });
  }
  return sorted;
}

function getSignatureStartMeasures(
  signatures: TimeSignatureEvent[],
  ppq: number
): number[] {
  const measures = [1];
  for (let index = 1; index < signatures.length; index += 1) {
    const previous = signatures[index - 1];
    const previousLength =
      ppq * (4 / Math.max(1, previous.denominator)) *
      Math.max(1, previous.numerator);
    const elapsed = (signatures[index].tick - previous.tick) / previousLength;
    measures[index] = measures[index - 1] + Math.ceil(elapsed - 0.01);
  }
  return measures;
}

export default MidiNotesPreview;
