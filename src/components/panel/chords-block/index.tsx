import React, { useRef, useState, useEffect, useCallback } from "react";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { BsPlusCircleFill } from "react-icons/bs";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import ChordItem from "./chords/item";
import { AutoScroller } from "./scrolling";
import { ManualScroller } from "./scrolling/manual-scroller";
import { usePlayerSetupStore } from "@/hooks/usePlayerSetup";
import useIsMobile from "@/hooks/useIsMobile";
import ZoomControl from "./zoom";
import ChordEditModal from "@/components/modals/chord";
import { Ruler } from "./ruler";

const PIXELS_PER_UNIT_MIDI = 0.1;
const PIXELS_PER_UNIT_TIME = 50;

const Playhead = ({
  onAddChord,
  isMobile,
}: {
  onAddChord: () => void;
  isMobile: boolean;
}) => {
  const lineStyle = isMobile
    ? "absolute top-0 left-1/2 w-0.5 h-full bg-purple-500 -translate-x-1/2"
    : "absolute left-0 top-1/2 h-0.5 w-full bg-purple-500 -translate-y-1/2";

  return (
    <div className="absolute top-0 left-0 w-full h-full z-20 pointer-events-none">
      <div className={lineStyle}>
        <button
          onClick={onAddChord}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                     text-purple-500 hover:text-purple-700 bg-white rounded-full
                     transition-colors pointer-events-auto"
          title="Add new chord at current time"
        >
          <BsPlusCircleFill />
        </button>
        <div
          className="absolute top-1/2 left-1/2 w-3 h-3 border-2 border-purple-500
                        bg-white rounded-full z-10 -translate-x-1/2 -translate-y-1/2"
        />
      </div>
    </div>
  );
};

const ChordsBlock: React.FC = () => {
  const mode = useKaraokeStore((state) => state.mode);
  const playerState = useKaraokeStore((state) => state.playerState);
  const chordsData = useKaraokeStore((state) => state.chordsData);
  const actions = useKaraokeStore((state) => state.actions);
  const playerControls = usePlayerSetupStore((state) => state.playerControls);
  const isMobile = useIsMobile();

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wasPlayingOnScrollStartRef = useRef(false);

  useEffect(() => {
    const bpm = playerState.midiInfo?.bpm ?? 0;
    if (mode === "midi" && bpm > 0) {
      setZoom(Math.max(0.25, Math.min(4, 120 / bpm)));
    } else {
      setZoom(1);
    }
  }, [mode, playerState.midiInfo?.bpm]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () =>
      setContainerSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    const observer = new ResizeObserver(updateSize);

    observer.observe(element);
    updateSize();
    return () => observer.disconnect();
  }, []);

  const pixelsPerUnit =
    (mode === "midi" ? PIXELS_PER_UNIT_MIDI : PIXELS_PER_UNIT_TIME) * zoom;
  const playheadPosition = isMobile
    ? containerSize.width / 2
    : containerSize.height / 2;
  const totalDuration = playerState.duration ?? 0;
  const trackSize = totalDuration * pixelsPerUnit;

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (useKaraokeStore.getState().isChordPanelAutoScrolling) return;

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      const scrollPos = isMobile
        ? e.currentTarget.scrollLeft
        : e.currentTarget.scrollTop;
      const newTick = scrollPos / pixelsPerUnit;

      actions.setChordPanelCenterTick(newTick);
      playerControls?.seek(newTick);

      scrollTimeoutRef.current = setTimeout(() => {
        if (wasPlayingOnScrollStartRef.current) {
          playerControls?.play();
          actions.setIsChordPanelAutoScrolling(true);
          wasPlayingOnScrollStartRef.current = false;
        }
      }, 250);
    },
    [pixelsPerUnit, actions, isMobile, playerControls]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      const { isChordPanelAutoScrolling, isPlaying, currentTime } =
        useKaraokeStore.getState();

      if (isChordPanelAutoScrolling && isPlaying) {
        const isVerticalScroll = Math.abs(e.deltaY) > Math.abs(e.deltaX);
        const isHorizontalScroll = Math.abs(e.deltaX) > Math.abs(e.deltaY);

        if (
          (!isMobile && isVerticalScroll) ||
          (isMobile && isHorizontalScroll)
        ) {
          wasPlayingOnScrollStartRef.current = true;
          playerControls?.pause();
          actions.setIsChordPanelAutoScrolling(false);
          actions.setChordPanelCenterTick(currentTime);
          actions.setPlayFromScrolledPosition(true);
        }
      }
    },
    [actions, isMobile, playerControls]
  );

  const handleTouchStart = useCallback(() => {
    const { isChordPanelAutoScrolling, isPlaying, currentTime } =
      useKaraokeStore.getState();
    if (isChordPanelAutoScrolling && isPlaying) {
      wasPlayingOnScrollStartRef.current = true;
      playerControls?.pause();
      actions.setIsChordPanelAutoScrolling(false);
      actions.setChordPanelCenterTick(currentTime);
      actions.setPlayFromScrolledPosition(true);
    }
  }, [actions, playerControls]);

  const handleAddChordAtPlayhead = useCallback(() => {
    const { isChordPanelAutoScrolling, chordPanelCenterTick, currentTime } =
      useKaraokeStore.getState();
    const finalTick = Math.max(
      0,
      Math.round(isChordPanelAutoScrolling ? currentTime : chordPanelCenterTick)
    );
    actions.openChordModal(undefined, finalTick);
  }, [actions]);

  const handleDragEnd = useCallback(
    (event: any) => {
      const originalTick = parseFloat(event.active.id.toString().split("-")[1]);
      const chord = chordsData.find((c) => c.tick === originalTick);
      if (!chord) return;

      const deltaPos = isMobile ? event.delta.x : event.delta.y;
      const newTick = originalTick + deltaPos / pixelsPerUnit;
      const finalTick = Math.max(
        0,
        mode === "midi" ? Math.round(newTick) : newTick
      );

      actions.updateChord(originalTick, { ...chord, tick: finalTick });
    },
    [chordsData, pixelsPerUnit, actions, mode, isMobile]
  );

  const handleChordClick = (tick: number) => {
    playerControls?.seek(tick);
    if (!playerControls?.isPlaying()) playerControls?.play();
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
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

        <Playhead onAddChord={handleAddChordAtPlayhead} isMobile={isMobile} />

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div
            ref={containerRef}
            className="h-full w-full bg-white border border-slate-300 rounded-lg relative"
            onMouseEnter={() => actions.setIsChordPanelHovered(true)}
            onMouseLeave={() => actions.setIsChordPanelHovered(false)}
          >
            <div
              ref={scrollContainerRef}
              className={scrollContainerClasses}
              onScroll={handleScroll}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
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
                      : {
                          height: `${trackSize}px`,
                          width: "100%",
                        }
                  }
                >
                  <div
                    className={
                      isMobile
                        ? "absolute top-0 left-0 w-full h-px bg-gray-100 z-0"
                        : "absolute top-0 left-4 h-full w-px bg-gray-100 z-0"
                    }
                  >
                    <Ruler
                      totalDuration={totalDuration}
                      mode={mode ?? "midi"}
                      ppq={playerState.midiInfo?.ppq ?? 480}
                      pixelsPerUnit={pixelsPerUnit}
                      zoom={zoom}
                      isMobile={isMobile}
                    />
                  </div>

                  {chordsData.map((chord, index) => (
                    <ChordItem
                      key={`${chord.tick}-${index}`}
                      chord={chord}
                      index={index}
                      pixelsPerTick={pixelsPerUnit}
                      onChordClick={handleChordClick}
                      onEditChord={actions.openChordModal}
                      onDeleteChord={actions.deleteChord}
                      isMobile={isMobile}
                    />
                  ))}
                </div>

                {isMobile && (
                  <div
                    style={{ width: `${playheadPosition}px`, flexShrink: 0 }}
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
