"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play } from "lucide-react";
import { useKaraokeStore } from "@/stores/karaoke-store";

function dispatchKey(code: string) {
  window.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true }));
  window.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
}

export function LyricsMobileControls() {
  const isPlaying = useKaraokeStore((state) => state.isPlaying);
  const isTimingActive = useKaraokeStore((state) => state.isTimingActive);
  const editingLineIndex = useKaraokeStore((state) => state.editingLineIndex);
  const timingMode = isTimingActive || editingLineIndex !== null;

  const buttonClass =
    "h-10 w-10 rounded-lg border border-line bg-panel text-foreground shadow-sm transition active:scale-95 touch-manipulation";
  const timingClass = timingMode
    ? "border-primary ring-2 ring-primary/20"
    : "";

  return (
    <div className="border-t border-line bg-panel/90 px-3 py-2">
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          className={`${buttonClass} border-primary/40 bg-primary/10 text-primary`}
          onClick={() => dispatchKey("Space")}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="mx-auto" /> : <Play className="mx-auto" />}
        </button>
        <span className="mx-1 h-6 w-px bg-raised-2" />
        <button type="button" className={buttonClass} onClick={() => dispatchKey("ArrowUp")} aria-label="Previous line">
          <ArrowUp className="mx-auto" />
        </button>
        <button type="button" className={buttonClass} onClick={() => dispatchKey("ArrowDown")} aria-label="Next line">
          <ArrowDown className="mx-auto" />
        </button>
        <span className="mx-1 h-6 w-px bg-raised-2" />
        <button type="button" className={`${buttonClass} ${timingClass}`} onClick={() => dispatchKey("ArrowLeft")} aria-label="Previous word">
          <ArrowLeft className="mx-auto" />
        </button>
        <button type="button" className={`${buttonClass} ${timingClass}`} onClick={() => dispatchKey("ArrowRight")} aria-label="Next word">
          <ArrowRight className="mx-auto" />
        </button>
        <span className={`ml-1 h-2 w-2 rounded-full ${isPlaying ? "bg-brand-2" : "bg-line-strong"}`} />
      </div>
    </div>
  );
}
