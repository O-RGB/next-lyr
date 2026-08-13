import React, { useEffect, useRef } from "react";
import { useTimerStore } from "@/timer-worker/store";

interface TimerRangeProps {
  duration: number;
  onSeek: (value: number) => void;
  filename?: string;
}

export const TimerRange = React.memo<TimerRangeProps>(
  ({ duration, onSeek, filename }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const onSeekRef = useRef(onSeek);

    useEffect(() => {
      onSeekRef.current = onSeek;
    }, [onSeek]);

    useEffect(() => {
      const updateInput = (value: number) => {
        const input = inputRef.current;
        if (input && input.value !== String(value)) input.value = String(value);
      };

      updateInput(useTimerStore.getState().displayValue);
      return useTimerStore.subscribe((next, previous) => {
        if (next.displayValue !== previous.displayValue) {
          updateInput(next.displayValue);
        }
      });
    }, []);

    return (
      <input
        ref={inputRef}
        type="range"
        min="0"
        max={duration || 100}
        defaultValue={useTimerStore.getState().displayValue}
        onChange={(e) => onSeekRef.current(Number(e.target.value))}
        className="w-full h-2 bg-raised-2 rounded-lg appearance-none cursor-pointer dark:bg-panel-2 disabled:opacity-50"
        disabled={!filename}
      />
    );
  }
);

TimerRange.displayName = "TimerRange";
