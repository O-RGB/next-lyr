import React, {
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { BsPlusCircleFill, BsPinAngleFill } from "react-icons/bs";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import ChordItem from "./chords/item";
import { IMidiInfo } from "@/types/common.type";
import { AutoScroller } from "./scrolling";
import { ManualScroller } from "./scrolling/manual-scroller";

interface ChordsBlockProps {
  onChordClick: (tick: number) => void;
  onAddChord: (tick?: number) => void;
  onEditChord: (chord: any) => void;
  onDeleteChord: (tick: number) => void;
  midiInfo: IMidiInfo | null;
}

const PIXELS_PER_100_TICKS = 100;

const ChordsBlock: React.FC<ChordsBlockProps> = ({
  onChordClick,
  onAddChord,
  onEditChord,
  onDeleteChord,
  midiInfo,
}) => {
  const chordsData = useKaraokeStore((state) => state.chordsData);
  const actions = useKaraokeStore((state) => state.actions);
  const isAutoScrolling = useKaraokeStore(
    (state) => state.isChordPanelAutoScrolling
  );
  // ไม่ต้องดึง chordPanelCenterTick มาตรงนี้แล้ว

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [zoom, setZoom] = useState(1); // Local state for zoom

  // Set initial zoom based on BPM
  useEffect(() => {
    if (midiInfo && midiInfo.bpm > 0) {
      const newZoom = 120 / midiInfo.bpm;
      // Clamp the zoom value between a reasonable range (e.g., 0.25x to 4x)
      setZoom(Math.max(0.25, Math.min(4, newZoom)));
    }
  }, [midiInfo]);

  useLayoutEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight);
    }
  }, []);

  const pixelsPerTick = (PIXELS_PER_100_TICKS / 100) * zoom;
  const playheadPosition = containerHeight / 2;
  const totalDurationTicks = midiInfo?.durationTicks ?? 30000;
  const trackHeight = totalDurationTicks * pixelsPerTick;

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (isAutoScrolling) return;

      const scrollTop = e.currentTarget.scrollTop;
      const newCenterTick = (scrollTop + playheadPosition) / pixelsPerTick;
      actions.setChordPanelCenterTick(newCenterTick);
    },
    [isAutoScrolling, playheadPosition, pixelsPerTick, actions]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      actions.setIsChordPanelAutoScrolling(false);
    },
    [actions]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const originalTick = parseInt(active.id.toString().split("-")[1]);
      const draggedChord = chordsData.find((c) => c.tick === originalTick);

      if (!draggedChord) return;

      const tickChange = delta.y / pixelsPerTick;
      const newTick = Math.round(originalTick + tickChange);
      const finalTick = Math.max(0, newTick);
      actions.updateChord(originalTick, { ...draggedChord, tick: finalTick });
    },
    [chordsData, pixelsPerTick, actions]
  );

  const followPlayback = useCallback(() => {
    actions.setIsChordPanelAutoScrolling(true);
  }, [actions]);

  // สร้างฟังก์ชันสำหรับจัดการการคลิกปุ่มเพิ่มคอร์ด
  const handleAddChordAtPlayhead = useCallback(() => {
    const { isChordPanelAutoScrolling, chordPanelCenterTick } =
      useKaraokeStore.getState();
    if (isChordPanelAutoScrolling) {
      onAddChord();
    } else {
      onAddChord(chordPanelCenterTick);
    }
  }, [onAddChord]);

  const stableOnChordClick = useCallback(
    (tick: number) => {
      onChordClick(tick);
    },
    [onChordClick]
  );

  const stableOnEditChord = useCallback(
    (chord: any) => {
      onEditChord(chord);
    },
    [onEditChord]
  );

  const stableOnDeleteChord = useCallback(
    (tick: number) => {
      onDeleteChord(tick);
    },
    [onDeleteChord]
  );

  const Ruler = useMemo(() => {
    const ticks = [];
    const majorInterval = midiInfo?.ppq ?? 480;
    const minorInterval = majorInterval / 4;

    for (let i = 0; i <= totalDurationTicks; i += minorInterval) {
      const isMajor = i % majorInterval === 0;
      ticks.push(
        <div
          key={`tick-${i}`}
          className="absolute left-0 w-full"
          style={{ top: `${i * pixelsPerTick}px` }}
        >
          <div
            className={`absolute h-px ${
              isMajor ? "bg-gray-400 w-4" : "bg-gray-200 w-2"
            }`}
          ></div>
          {isMajor && (
            <span className="absolute left-5 text-[8px] text-gray-400 -translate-y-1/2">
              {i}
            </span>
          )}
        </div>
      );
    }
    return ticks;
  }, [totalDurationTicks, midiInfo?.ppq, pixelsPerTick]);

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center p-2 bg-gray-100 rounded-md">
        <span className="text-xs font-bold mr-2">Zoom:</span>
        <input
          type="range"
          min="0.25"
          max="4"
          step="0.05"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full"
        />
        <span className="text-xs w-12 text-center">{zoom.toFixed(2)}x</span>
      </div>
      <div className="relative h-full">
        <AutoScroller
          containerRef={containerRef}
          pixelsPerTick={pixelsPerTick}
          playheadPosition={playheadPosition}
        />
        <ManualScroller
          containerRef={containerRef}
          pixelsPerTick={pixelsPerTick}
          playheadPosition={playheadPosition}
        />
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div
            ref={containerRef}
            className="relative h-full bg-white border border-slate-300 rounded-lg overflow-auto"
            onScroll={handleScroll}
            onWheel={handleWheel}
          >
            {!isAutoScrolling && (
              <button
                onClick={followPlayback}
                className="fixed bottom-2 right-2 z-30 p-2 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition"
                title="Follow Playback"
              >
                <BsPinAngleFill />
              </button>
            )}

            {/* Playhead indicator */}
            <div
              className="sticky top-1/2 -translate-y-1/2 left-0 w-full h-0.5 bg-purple-500 z-20 flex items-center pointer-events-none"
              style={{ top: `${playheadPosition}px` }}
            >
              <button
                onClick={handleAddChordAtPlayhead}
                className="z-50 absolute left-1/2 -translate-x-1/2 text-purple-500 hover:text-purple-700 bg-white rounded-full transition-colors pointer-events-auto"
                title="Add new chord at current time"
              >
                <BsPlusCircleFill />
              </button>
              <div className="absolute -left-1.5 w-3 h-3 border-2 border-purple-500 bg-white rounded-full z-10"></div>
            </div>

            {/* Track content */}
            <div
              className="relative w-full"
              style={{ height: `${trackHeight}px` }}
            >
              <div className="absolute top-0 left-4 h-full w-px bg-gray-100 z-0">
                {Ruler}
              </div>
              {chordsData.map((chord, index) => (
                <ChordItem
                  key={`${chord.tick}-${index}`}
                  chord={chord}
                  index={index}
                  pixelsPerTick={pixelsPerTick}
                  onChordClick={stableOnChordClick}
                  onEditChord={stableOnEditChord}
                  onDeleteChord={stableOnDeleteChord}
                />
              ))}
            </div>
          </div>
        </DndContext>
      </div>
    </div>
  );
};

export default ChordsBlock;
