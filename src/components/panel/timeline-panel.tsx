import React, { useState, useEffect, useRef, useMemo } from "react";
import { useKaraokeStore } from "../../stores/karaoke-store";

type ClipType = "lyrics" | "chords";
type Clip = {
  id: string;
  type: ClipType;
  start: number;
  duration: number;
  name: string;
  layer: number;
  originalIndex: number;
};

const PIXELS_PER_SECOND_DEFAULT = 50;
const PIXELS_PER_TICK_DEFAULT = 0.1;

const TimelinePanel: React.FC = () => {
  const {
    lyricsData,
    chordsData,
    mode,
    midiInfo,
    audioDuration,
    actions,
    currentTime,
  } = useKaraokeStore();

  const [clips, setClips] = useState<Clip[]>([]);
  const [zoom, setZoom] = useState(100);
  const [pixelsPerUnit, setPixelsPerUnit] = useState(PIXELS_PER_SECOND_DEFAULT);
  const [totalTime, setTotalTime] = useState(0);

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);

  const [draggedClip, setDraggedClip] = useState<{
    clip: Clip;
    offset: number;
  } | null>(null);
  const [resizedClip, setResizedClip] = useState<{
    clip: Clip;
    handle: "left" | "right";
  } | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  useEffect(() => {
    const basePixels =
      mode === "midi" ? PIXELS_PER_TICK_DEFAULT : PIXELS_PER_SECOND_DEFAULT;
    setPixelsPerUnit(basePixels * (zoom / 100));
  }, [mode, zoom]);

  useEffect(() => {
    const lyricClips: Clip[] = lyricsData.map((word, index) => ({
      id: `lyric-${word.index}`,
      type: "lyrics",
      start: word.start ?? 0,
      duration: word.length > 0 ? word.length : mode === "midi" ? 100 : 0.2,
      name: word.name,
      layer: 0,
      originalIndex: index,
    }));

    const chordClips: Clip[] = chordsData.map((chord, index) => ({
      id: `chord-${chord.tick}-${index}`,
      type: "chords",
      start: chord.tick,
      duration: mode === "midi" ? 100 : 0.2,
      name: chord.chord,
      layer: 1,
      originalIndex: index,
    }));

    setClips([...lyricClips, ...chordClips]);
  }, [lyricsData, chordsData, mode]);

  useEffect(() => {
    if (mode === "midi" && midiInfo) {
      setTotalTime(midiInfo.durationTicks);
    } else if (["mp3", "mp4", "youtube"].includes(mode ?? "")) {
      setTotalTime(audioDuration ?? 180);
    }
  }, [mode, midiInfo, audioDuration]);

  useEffect(() => {
    const timelineContainer = timelineContainerRef.current;
    if (!timelineContainer || timelineContainer.clientWidth === 0) return;

    const playheadPositionX = currentTime * pixelsPerUnit;
    const containerWidth = timelineContainer.clientWidth;

    const targetScrollLeft = playheadPositionX - containerWidth / 2;
    const newScrollLeft = Math.max(0, targetScrollLeft);

    if (Math.abs(newScrollLeft - timelineContainer.scrollLeft) > 1) {
      timelineContainer.scrollTo({
        left: newScrollLeft,
        behavior: "smooth",
      });
    }
  }, [currentTime, pixelsPerUnit]);

  const handleMouseDown = (e: React.MouseEvent, clip: Clip) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedClipId(clip.id);

    if (
      e.target instanceof HTMLElement &&
      e.target.classList.contains("resize-handle")
    ) {
      setResizedClip({
        clip,
        handle: e.target.classList.contains("left") ? "left" : "right",
      });
    } else {
      const timelineRect =
        timelineContainerRef.current!.getBoundingClientRect();
      const initialMouseX = e.clientX - timelineRect.left;
      const initialClipX = clip.start * pixelsPerUnit;
      setDraggedClip({ clip, offset: initialMouseX - initialClipX });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedClip && !resizedClip) return;
    e.preventDefault();

    const timelineRect = timelineContainerRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - timelineRect.left;

    if (draggedClip) {
      const { clip, offset } = draggedClip;
      const newStartInPixels = Math.max(0, mouseX - offset);
      const newStart = newStartInPixels / pixelsPerUnit;

      setClips((prev) =>
        prev.map((c) => (c.id === clip.id ? { ...c, start: newStart } : c))
      );
    }

    if (resizedClip) {
      const { clip, handle } = resizedClip;
      const startInPixels = clip.start * pixelsPerUnit;

      if (handle === "right") {
        const newWidthInPixels = Math.max(10, mouseX - startInPixels);
        const newDuration = newWidthInPixels / pixelsPerUnit;
        setClips((prev) =>
          prev.map((c) =>
            c.id === clip.id ? { ...c, duration: newDuration } : c
          )
        );
      } else {
        const originalEndInPixels =
          (clip.start + clip.duration) * pixelsPerUnit;
        const newStartInPixels = Math.max(
          0,
          Math.min(mouseX, originalEndInPixels - 10)
        );
        const newStart = newStartInPixels / pixelsPerUnit;
        const newDuration =
          (originalEndInPixels - newStartInPixels) / pixelsPerUnit;

        setClips((prev) =>
          prev.map((c) =>
            c.id === clip.id
              ? { ...c, start: newStart, duration: newDuration }
              : c
          )
        );
      }
    }
  };

  const handleMouseUp = () => {
    if (draggedClip) {
      const { clip } = draggedClip;
      const newStart = parseFloat(clip.start.toFixed(3));
      const newEnd = parseFloat((clip.start + clip.duration).toFixed(3));

      if (clip.type === "lyrics") {
        actions.updateWordTiming(clip.originalIndex, newStart, newEnd);
      } else {
        const updatedChord = {
          ...chordsData[clip.originalIndex],
          tick: Math.round(newStart),
        };
        actions.updateChord(chordsData[clip.originalIndex].tick, updatedChord);
      }
    }
    if (resizedClip) {
      const { clip } = resizedClip;
      const newStart = parseFloat(clip.start.toFixed(3));
      const newEnd = parseFloat((clip.start + clip.duration).toFixed(3));

      if (clip.type === "lyrics") {
        actions.updateWordTiming(clip.originalIndex, newStart, newEnd);
      }
    }

    setDraggedClip(null);
    setResizedClip(null);
  };

  const handleDeleteClip = () => {
    if (!selectedClipId) return;
    const clipToDelete = clips.find((c) => c.id === selectedClipId);
    if (!clipToDelete) return;

    if (clipToDelete.type === "lyrics") {
      console.log("Deleting lyrics requires more complex store logic.");
    } else {
      actions.deleteChord(chordsData[clipToDelete.originalIndex].tick);
    }
    setSelectedClipId(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        handleDeleteClip();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedClipId, clips]);

  const timeRulerContent = useMemo(() => {
    const markers = [];
    const unit = mode === "midi" ? "tick" : "s";
    const majorInterval =
      zoom > 150 ? (mode === "midi" ? 100 : 5) : mode === "midi" ? 480 : 10;
    const minorInterval = majorInterval / (zoom > 50 ? 5 : 2);

    for (let i = 0; i <= totalTime; i += minorInterval) {
      const isMajor = i % majorInterval === 0;
      markers.push(
        <div
          key={`time-${i}`}
          className="absolute h-full"
          style={{ left: `${i * pixelsPerUnit}px` }}
        >
          {isMajor && (
            <div className="text-xs text-gray-400 -mt-5">
              {i} {unit}
            </div>
          )}
          <div
            className={`w-px bg-gray-600 ${isMajor ? "h-full" : "h-1/2 mt-3"}`}
          ></div>
        </div>
      );
    }
    return markers;
  }, [totalTime, pixelsPerUnit, zoom, mode]);

  return (
    <div
      className="bg-gray-800 text-white h-full flex flex-col p-2 rounded-lg"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="flex items-center mb-2 p-2 bg-gray-900 rounded-md">
        <h3 className="font-bold mr-4">Timeline Editor</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom((z) => Math.max(10, z - 10))}>
            -
          </button>
          <input
            type="range"
            min="10"
            max="500"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-32"
          />
          <button onClick={() => setZoom((z) => Math.min(500, z + 10))}>
            +
          </button>
          <span className="text-sm w-12">{zoom}%</span>
        </div>
      </div>

      <div
        ref={timelineContainerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden relative bg-gray-700 p-2 rounded-md"
      >
        <div
          className="relative h-full"
          style={{ width: `${totalTime * pixelsPerUnit}px`, minWidth: "100%" }}
        >
          <div className="h-6 w-full sticky top-0 bg-gray-700 z-20">
            {timeRulerContent}
          </div>

          <div
            ref={playheadRef}
            className="absolute top-0 w-0.5 bg-red-500 h-full z-30"
            style={{ left: `${currentTime * pixelsPerUnit}px` }}
          >
            <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
          </div>

          <div className="relative w-full h-full pt-4">
            <div className="h-16 border-b border-gray-600 relative">
              <div className="absolute left-2 -top-2 text-xs font-bold text-gray-400">
                Lyrics
              </div>
              {clips
                .filter((c) => c.type === "lyrics")
                .map((clip) => (
                  <div
                    key={clip.id}
                    className={`absolute top-6 h-8 rounded-md flex items-center justify-center px-2 text-xs text-white cursor-grab ${
                      selectedClipId === clip.id ? "ring-2 ring-yellow-400" : ""
                    }`}
                    style={{
                      left: `${clip.start * pixelsPerUnit}px`,
                      width: `${Math.max(2, clip.duration * pixelsPerUnit)}px`,
                      backgroundColor: "rgba(59, 130, 246, 0.7)",
                    }}
                    onMouseDown={(e) => handleMouseDown(e, clip)}
                  >
                    <div className="resize-handle left"></div>
                    <span className="truncate">{clip.name}</span>
                    <div className="resize-handle right"></div>
                  </div>
                ))}
            </div>

            <div className="h-16 relative">
              <div className="absolute left-2 -top-2 text-xs font-bold text-gray-400">
                Chords
              </div>
              {clips
                .filter((c) => c.type === "chords")
                .map((clip) => (
                  <div
                    key={clip.id}
                    className={`absolute top-6 h-8 rounded-md flex items-center justify-center px-2 text-xs text-white cursor-grab ${
                      selectedClipId === clip.id ? "ring-2 ring-yellow-400" : ""
                    }`}
                    style={{
                      left: `${clip.start * pixelsPerUnit}px`,
                      width: `${Math.max(2, clip.duration * pixelsPerUnit)}px`,
                      backgroundColor: "rgba(139, 92, 246, 0.7)",
                    }}
                    onMouseDown={(e) => handleMouseDown(e, clip)}
                  >
                    <div className="resize-handle left"></div>
                    {clip.name}
                    <div className="resize-handle right"></div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .resize-handle {
          position: absolute;
          width: 8px;
          top: 0;
          bottom: 0;
          cursor: col-resize;
          z-index: 10;
        }
        .resize-handle.left {
          left: -4px;
        }
        .resize-handle.right {
          right: -4px;
        }
      `}</style>
    </div>
  );
};

export default TimelinePanel;
