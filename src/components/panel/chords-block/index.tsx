import React, {
  useMemo,
  useRef,
  useLayoutEffect,
  useState,
  useEffect,
} from "react";
import Chord from "./chords";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { BsPlusCircleFill, BsPinAngleFill } from "react-icons/bs";
import { ChordEvent } from "@/modules/midi-klyr-parser/lib/processor";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";

interface ChordsBlockProps {
  onChordClick: (tick: number) => void;
  onAddChord: (tick: number) => void;
  onEditChord: (chord: ChordEvent) => void;
  onDeleteChord: (tick: number) => void;
}

const PIXELS_PER_100_TICKS = 50;

const ChordsBlock: React.FC<ChordsBlockProps> = ({
  onChordClick,
  onAddChord,
  onEditChord,
  onDeleteChord,
}) => {
  const chordsData = useKaraokeStore((state) => state.chordsData);
  const actions = useKaraokeStore((state) => state.actions); // <-- ดึง actions มาใช้
  const currentTime = useKaraokeStore((state) => state.currentTime);
  const midiInfo = useKaraokeStore((state) => state.midiInfo);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [scrollTop, setScrollTop] = useState(0);

  useLayoutEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight);
    }
  }, []);

  const pixelsPerTick = PIXELS_PER_100_TICKS / 100;
  const playheadPosition = containerHeight / 2;
  const totalDurationTicks = midiInfo?.durationTicks ?? 30000;
  const trackHeight = totalDurationTicks * pixelsPerTick;

  useEffect(() => {
    if (isAutoScrolling) {
      const targetScrollTop = currentTime * pixelsPerTick - playheadPosition;
      setScrollTop(targetScrollTop);
    }
  }, [currentTime, isAutoScrolling, playheadPosition, pixelsPerTick]);

  const activeChordTick = useMemo(() => {
    const currentChord = [...chordsData]
      .reverse()
      .find((chord) => chord.tick <= currentTime);
    return currentChord?.tick;
  }, [chordsData, currentTime]);

  const trackTransform = `translateY(${-scrollTop}px)`;

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsAutoScrolling(false);
    setScrollTop((prevScrollTop) => {
      const newScrollTop = prevScrollTop + e.deltaY;
      return Math.max(0, Math.min(newScrollTop, trackHeight - containerHeight));
    });
  };

  // --- vvvvvvvv dnd-kit Logic vvvvvvvv ---
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const originalTick = parseInt(active.id.toString().split("-")[1]);
    const draggedChord = chordsData.find((c) => c.tick === originalTick);

    if (!draggedChord) return;

    // คำนวณ tick ที่เปลี่ยนไปจากระยะที่ลาก (delta.y)
    const tickChange = delta.y / pixelsPerTick;
    const newTick = Math.round(originalTick + tickChange);

    // ป้องกันไม่ให้ tick ติดลบ
    const finalTick = Math.max(0, newTick);

    // เรียก action เพื่ออัปเดตตำแหน่งคอร์ดใน store
    actions.updateChord(originalTick, { ...draggedChord, tick: finalTick });
  };
  // --- ^^^^^^^^^^ dnd-kit Logic ^^^^^^^^^^ ---

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
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div
        ref={containerRef}
        className="relative h-full bg-white border border-slate-300 rounded-lg overflow-hidden"
        onWheel={handleWheel}
      >
        {!isAutoScrolling && (
          <button
            onClick={() => setIsAutoScrolling(true)}
            className="absolute bottom-2 right-2 z-30 p-2 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition"
            title="Follow Playback"
          >
            <BsPinAngleFill />
          </button>
        )}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-0.5 bg-purple-500 z-20 flex items-center">
          <div className="absolute -left-1.5 w-3 h-3 border-2 border-purple-500 bg-white rounded-full"></div>
          <button
            onClick={() => onAddChord(Math.round(currentTime))}
            className="absolute left-1/2 -translate-x-1/2 text-purple-500 hover:text-purple-700 transition-colors"
            title="Add new chord at current time"
          >
            <BsPlusCircleFill />
          </button>
        </div>
        <div
          className="relative top-0 left-0 w-full" // ใช้ relative แทน absolute
          style={{
            height: `${trackHeight}px`,
            transform: trackTransform,
            transition: isAutoScrolling
              ? "transform 100ms ease-linear"
              : "none",
          }}
        >
          <div className="absolute top-0 left-4 h-full w-px bg-gray-100 z-0">
            {Ruler}
          </div>
          {chordsData.map((chord, index) => (
            <div
              key={`${chord.tick}-${index}`}
              className="absolute w-[calc(100%-2rem)] left-1/2 -translate-x-1/2 z-10"
              style={{
                top: `${chord.tick * pixelsPerTick}px`,
              }}
            >
              <Chord
                id={`chord-${chord.tick}-${index}`} // ID ที่ไม่ซ้ำกัน
                title={chord.chord}
                isActive={chord.tick === activeChordTick}
                onClick={() => onChordClick(chord.tick)}
                onEdit={() => onEditChord(chord)}
                onDelete={() => onDeleteChord(chord.tick)}
              />
            </div>
          ))}
        </div>
      </div>
    </DndContext>
  );
};

export default ChordsBlock;
