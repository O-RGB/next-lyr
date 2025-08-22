import React, {
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { BsPlusCircleFill } from "react-icons/bs";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import ChordItem from "./chords/item";
import { AutoScroller } from "./scrolling";
import { ManualScroller } from "./scrolling/manual-scroller";
import { usePlayerSetupStore } from "@/hooks/usePlayerSetup";
import useIsMobile from "@/hooks/useIsMobile";
import ZoomControl from "./zoom";

interface ChordsBlockProps {}

const PIXELS_PER_UNIT_BASE_MIDI = 0.1;
const PIXELS_PER_UNIT_BASE_TIME = 50;
const CHORD_ITEM_HEIGHT_PX = 34;

const Playhead = ({
  onAddChord,
  isMobile,
}: {
  onAddChord: () => void;
  isMobile: boolean;
}) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full z-20 pointer-events-none">
      <div
        className={
          isMobile
            ? "absolute top-0 left-1/2 w-0.5 h-full bg-purple-500 -translate-x-1/2"
            : "absolute left-0 top-1/2 h-0.5 w-full bg-purple-500 -translate-y-1/2"
        }
      >
        <button
          onClick={onAddChord}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-500 hover:text-purple-700 bg-white rounded-full transition-colors pointer-events-auto"
          title="Add new chord at current time"
        >
          <BsPlusCircleFill />
        </button>
        <div className="absolute top-1/2 left-1/2 w-3 h-3 border-2 border-purple-500 bg-white rounded-full z-10 -translate-x-1/2 -translate-y-1/2"></div>
      </div>
    </div>
  );
};

const ChordsBlock: React.FC<ChordsBlockProps> = ({}) => {
  const mode = useKaraokeStore((state) => state.mode);
  const playerState = useKaraokeStore((state) => state.playerState);
  const chordsData = useKaraokeStore((state) => state.chordsData);
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const actions = useKaraokeStore((state) => state.actions);
  const playerControls = usePlayerSetupStore((state) => state.playerControls);
  const isMobile = useIsMobile();

  const onChordClick = (tick: number) => {
    if (playerControls) {
      playerControls.seek(tick);
      if (!playerControls.isPlaying()) {
        playerControls.play();
      }
    }
  };

  const onAddChord = (lineIndex: number) => {
    const wordsInLine = lyricsData.filter((w) => w.lineIndex === lineIndex);
    const timedWordsInLine = wordsInLine.filter(
      (w) => w.start !== null && w.end !== null
    );
    const { minLineTick, maxLineTick } =
      timedWordsInLine.length > 0
        ? {
            minLineTick: Math.min(...timedWordsInLine.map((w) => w.start!)),
            maxLineTick: Math.max(...timedWordsInLine.map((w) => w.end!)),
          }
        : { minLineTick: undefined, maxLineTick: undefined };
    let suggestedTick = playerControls?.getCurrentTime() ?? 0;
    if (minLineTick !== undefined && maxLineTick !== undefined) {
      suggestedTick = Math.max(
        minLineTick,
        Math.min(maxLineTick, suggestedTick)
      );
    } else if (suggestedTick === 0) {
      suggestedTick = 1;
    }

    actions.openChordModal(
      undefined,
      Math.round(suggestedTick),
      minLineTick,
      maxLineTick
    );
  };

  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (
      mode === "midi" &&
      playerState.midiInfo &&
      playerState.midiInfo.bpm > 0
    ) {
      const newZoom = 120 / playerState.midiInfo.bpm;
      setZoom(Math.max(0.25, Math.min(4, newZoom)));
    } else {
      setZoom(1);
    }
  }, [mode, playerState.midiInfo]);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(() => {
      setContainerSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    });

    observer.observe(element);
    setContainerSize({
      width: element.clientWidth,
      height: element.clientHeight,
    });

    return () => observer.disconnect();
  }, []);

  const pixelsPerUnit = useMemo(() => {
    const base =
      mode === "midi" ? PIXELS_PER_UNIT_BASE_MIDI : PIXELS_PER_UNIT_BASE_TIME;
    return base * zoom;
  }, [mode, zoom]);

  const playheadPosition = isMobile
    ? containerSize.width / 2
    : containerSize.height / 2;
  const totalDuration = playerState.duration ?? 0;
  const trackSize = totalDuration * pixelsPerUnit;

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const state = useKaraokeStore.getState();
      if (state.isChordPanelAutoScrolling) {
        return;
      }
      actions.setPlayFromScrolledPosition(true);

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      const scrollPos = isMobile
        ? e.currentTarget.scrollLeft
        : e.currentTarget.scrollTop;
      const newCenterTick = scrollPos / pixelsPerUnit;

      actions.setChordPanelCenterTick(newCenterTick);

      if (state.isPlaying) {
        scrollTimeoutRef.current = setTimeout(() => {
          actions.setIsChordPanelAutoScrolling(true);
        }, 250);
      }
    },
    [pixelsPerUnit, actions, isMobile]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      const state = useKaraokeStore.getState();
      if (state.isChordPanelAutoScrolling && state.isPlaying) {
        actions.setIsChordPanelAutoScrolling(false);
        actions.setChordPanelCenterTick(state.currentTime);
        actions.setPlayFromScrolledPosition(true);
      }
    },
    [actions]
  );

  const handleMouseEnter = useCallback(() => {
    actions.setIsChordPanelHovered(true);
  }, [actions]);

  const handleMouseLeave = useCallback(() => {
    actions.setIsChordPanelHovered(false);
  }, [actions]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const originalTick = parseFloat(active.id.toString().split("-")[1]);
      const draggedChord = chordsData.find((c) => c.tick === originalTick);
      if (!draggedChord) return;

      const deltaPos = isMobile ? delta.x : delta.y;
      const tickChange = deltaPos / pixelsPerUnit;

      const newTick = originalTick + tickChange;
      const finalTick = Math.max(
        0,
        mode === "midi" ? Math.round(newTick) : newTick
      );
      actions.updateChord(originalTick, { ...draggedChord, tick: finalTick });
    },
    [chordsData, pixelsPerUnit, actions, mode, isMobile]
  );

  const handleAddChordAtPlayhead = useCallback(() => {
    const { isChordPanelAutoScrolling, chordPanelCenterTick, currentTime } =
      useKaraokeStore.getState();
    const chordHeightInTicks = CHORD_ITEM_HEIGHT_PX / 2 / pixelsPerUnit;
    let tickToAdd: number;
    if (isChordPanelAutoScrolling) {
      tickToAdd = currentTime - chordHeightInTicks;
    } else {
      tickToAdd = chordPanelCenterTick - chordHeightInTicks;
    }
    const finalTick = Math.max(0, tickToAdd);
    onAddChord(finalTick);
  }, [pixelsPerUnit]);

  const Ruler = useMemo(() => {
    if (totalDuration === 0) return null;
    const ticks = [];
    let majorInterval: number;
    let minorInterval: number;

    if (mode === "midi") {
      majorInterval = playerState.midiInfo?.ppq ?? 480;
      minorInterval = majorInterval / 4;
    } else {
      if (zoom > 2.5) {
        majorInterval = 1;
        minorInterval = 0.2;
      } else if (zoom > 0.75) {
        majorInterval = 5;
        minorInterval = 1;
      } else {
        majorInterval = 10;
        minorInterval = 2;
      }
    }

    for (let i = 0; i <= totalDuration; i += minorInterval) {
      const isMajor =
        Math.abs(i % majorInterval) < 1e-9 ||
        Math.abs((i % majorInterval) - majorInterval) < 1e-9;
      const label =
        mode === "midi" ? i : i.toFixed(i < 10 && minorInterval < 1 ? 1 : 0);

      const rulerItemStyle: React.CSSProperties = isMobile
        ? { left: `${i * pixelsPerUnit}px` }
        : { top: `${i * pixelsPerUnit}px` };

      const lineClasses = isMobile
        ? `absolute h-full ${
            isMajor ? "bg-gray-400 w-px h-4" : "bg-gray-200 w-px h-2"
          }`
        : `absolute h-px ${isMajor ? "bg-gray-400 w-4" : "bg-gray-200 w-2"}`;

      const labelClasses = isMobile
        ? "absolute top-5 text-[8px] text-gray-400 -translate-x-1/2 whitespace-nowrap"
        : "absolute left-5 text-[8px] text-gray-400 -translate-y-1/2 whitespace-nowrap";

      ticks.push(
        <div
          key={`tick-${i}`}
          className={
            isMobile ? "absolute top-0 h-full" : "absolute left-0 w-full"
          }
          style={rulerItemStyle}
        >
          <div className={lineClasses}></div>
          {isMajor && (
            <span className={labelClasses}>
              {label}
              {mode !== "midi" && "s"}
            </span>
          )}
        </div>
      );
    }
    return ticks;
  }, [
    totalDuration,
    mode,
    playerState.midiInfo?.ppq,
    pixelsPerUnit,
    zoom,
    isMobile,
  ]);

  return (
    <div className="h-full flex flex-row md:flex-col gap-2 overflow-hidden">
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

        <Playhead onAddChord={handleAddChordAtPlayhead} isMobile={isMobile} />

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div
            ref={containerRef}
            className="h-full w-full bg-white border border-slate-300 rounded-lg relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div
              ref={scrollContainerRef}
              className="absolute inset-0 overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={handleScroll}
              onWheel={handleWheel}
            >
              <div
                style={
                  isMobile
                    ? { display: "flex", height: "100%" }
                    : {
                        paddingTop: `${playheadPosition}px`,
                        paddingBottom: `${playheadPosition}px`,
                        width: "100%",
                      }
                }
              >
                {isMobile && (
                  <div
                    style={{ width: `${playheadPosition}px`, flexShrink: 0 }}
                    aria-hidden="true"
                  />
                )}
                <div
                  className="relative"
                  style={
                    isMobile
                      ? {
                          width: `${trackSize}px`,
                          height: "100%",
                          flexShrink: 0,
                        }
                      : { height: `${trackSize}px`, width: "100%" }
                  }
                >
                  <div
                    className={
                      isMobile
                        ? "absolute top-0 left-0 w-full h-px bg-gray-100 z-0"
                        : "absolute top-0 left-4 h-full w-px bg-gray-100 z-0"
                    }
                  >
                    {totalDuration > 0 && Ruler}
                  </div>
                  {chordsData.map((chord, index) => (
                    <ChordItem
                      key={`${chord.tick}-${index}`}
                      chord={chord}
                      index={index}
                      pixelsPerTick={pixelsPerUnit}
                      onChordClick={onChordClick}
                      onEditChord={actions.openChordModal}
                      onDeleteChord={actions.deleteChord}
                      isMobile={isMobile}
                    />
                  ))}
                </div>
                {isMobile && (
                  <div
                    style={{ width: `${playheadPosition}px`, flexShrink: 0 }}
                    aria-hidden="true"
                  />
                )}
              </div>
            </div>
          </div>
        </DndContext>
      </div>
    </div>
  );
};

export default ChordsBlock;
