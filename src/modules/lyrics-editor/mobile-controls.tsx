"use client";

import { useKaraokeStore } from "@/stores/karaoke-store";
import {
  FaArrowDown,
  FaArrowLeft,
  FaArrowRight,
  FaArrowUp,
  FaPause,
  FaPlay,
} from "react-icons/fa";

function dispatchKey(code: string) {
  window.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true }));
}

export function LyricsMobileControls() {
  const isPlaying = useKaraokeStore((state) => state.isPlaying);
  const isTimingActive = useKaraokeStore((state) => state.isTimingActive);
  const editingLineIndex = useKaraokeStore((state) => state.editingLineIndex);
  const timingMode = isTimingActive || editingLineIndex !== null;

  const buttonClass =
    "h-10 w-10 rounded-lg border border-gray-300 bg-gradient-to-b from-gray-50 to-gray-100 text-gray-700 shadow-sm transition active:scale-95 touch-manipulation";
  const timingClass = timingMode
    ? "border-purple-500 ring-2 ring-purple-200"
    : "";

  return (
    <div className="border-t border-gray-200 bg-white/90 px-3 py-2">
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          className={`${buttonClass} border-blue-300 bg-blue-50 text-blue-700`}
          onClick={() => dispatchKey("Space")}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <FaPause className="mx-auto" /> : <FaPlay className="mx-auto" />}
        </button>
        <span className="mx-1 h-6 w-px bg-gray-200" />
        <button type="button" className={buttonClass} onClick={() => dispatchKey("ArrowUp")} aria-label="Previous line">
          <FaArrowUp className="mx-auto" />
        </button>
        <button type="button" className={buttonClass} onClick={() => dispatchKey("ArrowDown")} aria-label="Next line">
          <FaArrowDown className="mx-auto" />
        </button>
        <span className="mx-1 h-6 w-px bg-gray-200" />
        <button type="button" className={`${buttonClass} ${timingClass}`} onClick={() => dispatchKey("ArrowLeft")} aria-label="Previous word">
          <FaArrowLeft className="mx-auto" />
        </button>
        <button type="button" className={`${buttonClass} ${timingClass}`} onClick={() => dispatchKey("ArrowRight")} aria-label="Next word">
          <FaArrowRight className="mx-auto" />
        </button>
        <span className={`ml-1 h-2 w-2 rounded-full ${isPlaying ? "bg-green-500" : "bg-gray-300"}`} />
      </div>
    </div>
  );
}
