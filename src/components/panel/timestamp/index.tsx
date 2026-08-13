import { useKaraokeStore } from "@/stores/karaoke-store";
import { useTimerStore } from "@/timer-worker/store";
import React, { useEffect, useRef } from "react";
import BeatIndicator from "./beat-indicator";

const TimeStampe: React.FC = () => {
  const mode = useKaraokeStore((state) => state.mode);
  const timeRef = useRef<HTMLSpanElement>(null);
  const tempoRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const update = (value: number, bpm: number) => {
      if (timeRef.current) {
        timeRef.current.textContent =
          mode === "midi" ? String(Math.round(value)) : value.toFixed(2);
      }
      if (tempoRef.current) tempoRef.current.textContent = String(bpm);
    };

    const initial = useTimerStore.getState();
    update(initial.displayValue, initial.displayBpm);

    return useTimerStore.subscribe((next, previous) => {
      if (
        next.displayValue !== previous.displayValue ||
        next.displayBpm !== previous.displayBpm
      ) {
        update(next.displayValue, next.displayBpm);
      }
    });
  }, [mode]);

  return (
    <div className="flex gap-2 items-center">
      <div className="tabnum flex items-center gap-4 border border-line-soft bg-lane px-3 py-1 text-sm text-foreground">
        {mode === "midi" && <BeatIndicator />}

        <div className="flex items-center">
          <span className="label-xs mr-1">
            {mode === "midi" ? "Tick:" : "Time:"}
          </span>
          <span>
            <span ref={timeRef} />
          </span>
        </div>
      </div>
      <div className="tabnum flex items-center gap-1 border border-line-soft bg-lane px-3 py-1 text-sm text-foreground">
        <span className="label-xs">BPM:</span>
        <span ref={tempoRef} />
      </div>
    </div>
  );
};

export default React.memo(TimeStampe);
