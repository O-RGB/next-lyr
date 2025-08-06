// src/components/panel/chords-block/index.tsx
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

interface ChordsBlockProps {
  onChordClick: (tick: number) => void;
  onAddChord: (tick?: number) => void;
  onEditChord: (chord: any) => void;
  onDeleteChord: (tick: number) => void;
}

const PIXELS_PER_UNIT_BASE_MIDI = 0.1;
const PIXELS_PER_UNIT_BASE_TIME = 50;
const CHORD_ITEM_HEIGHT_PX = 34;

const ChordsBlock: React.FC<ChordsBlockProps> = ({
  onChordClick,
  onAddChord,
  onEditChord,
  onDeleteChord,
}) => {
  const { mode, playerState, chordsData, actions } = useKaraokeStore();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);
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
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight);
    }
  }, []);

  const pixelsPerUnit = useMemo(() => {
    const base =
      mode === "midi" ? PIXELS_PER_UNIT_BASE_MIDI : PIXELS_PER_UNIT_BASE_TIME;
    return base * zoom;
  }, [mode, zoom]);

  const playheadPosition = containerHeight / 2;
  const totalDuration = playerState.duration ?? 0;
  // vvvvvvvvvv จุดแก้ไข vvvvvvvvvv
  // เพิ่มความสูงของ Track ทั้งหมดเท่ากับความสูงของ container เพื่อสร้าง padding บนและล่าง
  const trackHeight = totalDuration * pixelsPerUnit + containerHeight;
  // ^^^^^^^^^^ สิ้นสุดจุดแก้ไข ^^^^^^^^^^

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
      const scrollTop = e.currentTarget.scrollTop;
      // vvvvvvvvvv จุดแก้ไข vvvvvvvvvv
      // คำนวณ tick ที่อยู่ตรงกลางจอใหม่ให้ถูกต้องตาม layout ใหม่
      const newCenterTick = scrollTop / pixelsPerUnit;
      // ^^^^^^^^^^ สิ้นสุดจุดแก้ไข ^^^^^^^^^^
      actions.setChordPanelCenterTick(newCenterTick);

      if (state.isPlaying) {
        scrollTimeoutRef.current = setTimeout(() => {
          actions.setIsChordPanelAutoScrolling(true);
        }, 250);
      }
    },
    [pixelsPerUnit, actions]
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
      const tickChange = delta.y / pixelsPerUnit;
      const newTick = originalTick + tickChange;
      const finalTick = Math.max(
        0,
        mode === "midi" ? Math.round(newTick) : newTick
      );
      actions.updateChord(originalTick, { ...draggedChord, tick: finalTick });
    },
    [chordsData, pixelsPerUnit, actions, mode]
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
  }, [onAddChord, pixelsPerUnit]);

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
      ticks.push(
        <div
          key={`tick-${i}`}
          className="absolute left-0 w-full"
          style={{ top: `${i * pixelsPerUnit}px` }}
        >
          <div
            className={`absolute h-px ${
              isMajor ? "bg-gray-400 w-4" : "bg-gray-200 w-2"
            }`}
          ></div>
          {isMajor && (
            <span className="absolute left-5 text-[8px] text-gray-400 -translate-y-1/2 whitespace-nowrap">
              {label}
              {mode !== "midi" && "s"}
            </span>
          )}
        </div>
      );
    }
    return ticks;
  }, [totalDuration, mode, playerState.midiInfo?.ppq, pixelsPerUnit, zoom]);

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
          pixelsPerTick={pixelsPerUnit}
          playheadPosition={playheadPosition}
        />
        <ManualScroller
          containerRef={containerRef}
          pixelsPerTick={pixelsPerUnit}
          playheadPosition={playheadPosition}
        />
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div
            ref={containerRef}
            className="relative h-full bg-white border border-slate-300 rounded-lg overflow-auto"
            onScroll={handleScroll}
            onWheel={handleWheel}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div
              className="sticky top-1/2 -translate-y-1/2 left-0 w-full h-0.5 bg-purple-500 z-20 flex items-center pointer-events-none"
              style={{ top: `${playheadPosition}px` }}
            >
              <button
                onClick={handleAddChordAtPlayhead}
                className="z-50 absolute left-1/2 -translate-x-1/2 text-purple-500 hover:text-purple-700 bg-white transition-colors pointer-events-auto"
                title="Add new chord at current time"
              >
                <BsPlusCircleFill />
              </button>
              <div className="absolute -left-1.5 w-3 h-3 border-2 border-purple-500 bg-white rounded-full z-10"></div>
            </div>
            <div
              className="relative w-full"
              style={{ height: `${trackHeight}px` }}
            >
              {/* vvvvvvvvvv จุดแก้ไข vvvvvvvvvv */}
              {/* เพิ่ม Div ครอบเพื่อสร้าง Padding ด้านบน */}
              <div
                className="relative"
                style={{ top: `${playheadPosition}px` }}
              >
                {/* ^^^^^^^^^^ สิ้นสุดจุดแก้ไข ^^^^^^^^^^ */}
                <div className="absolute top-0 left-4 h-full w-px bg-gray-100 z-0">
                  {totalDuration > 0 && Ruler}
                </div>
                {chordsData.map((chord, index) => (
                  <ChordItem
                    key={`${chord.tick}-${index}`}
                    chord={chord}
                    index={index}
                    pixelsPerTick={pixelsPerUnit}
                    onChordClick={onChordClick}
                    onEditChord={onEditChord}
                    onDeleteChord={onDeleteChord}
                  />
                ))}
              </div>
            </div>
          </div>
        </DndContext>
      </div>
    </div>
  );
};

export default ChordsBlock;
