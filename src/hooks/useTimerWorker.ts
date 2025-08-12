// src/hooks/useTimerWorker.ts
import { useEffect, useRef, useCallback, useMemo } from "react";
import { useKaraokeStore } from "../stores/karaoke-store";

export const useTimerWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const actions = useKaraokeStore((state) => state.actions);
  const mode = useKaraokeStore((state) => state.mode);
  const midiInfo = useKaraokeStore((state) => state.playerState.midiInfo);

  useEffect(() => {
    const worker = new Worker(
      new URL("/public/worker/timer-worker.ts", import.meta.url)
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === "tick") {
        let timeValue = e.data.time; // Time from worker is always in seconds

        if (
          mode === "midi" &&
          midiInfo &&
          midiInfo.bpm > 0 &&
          midiInfo.ppq > 0
        ) {
          // Convert seconds to ticks for the global store
          timeValue = ((timeValue * midiInfo.bpm) / 60) * midiInfo.ppq;
        }

        actions.setCurrentTime(timeValue);
      }
    };

    return () => {
      worker.terminate();
    };
  }, [actions, mode, midiInfo]); // <<< สำคัญ: ต้องมี midiInfo ที่นี่

  const startTimer = useCallback(() => {
    workerRef.current?.postMessage({ command: "start" });
  }, []);

  const stopTimer = useCallback(() => {
    workerRef.current?.postMessage({ command: "stop" });
  }, []);

  const seekTimer = useCallback((timeInSeconds: number) => {
    // <<< ย้ำว่าค่าที่รับเป็นวินาที
    workerRef.current?.postMessage({ command: "seek", value: timeInSeconds });
  }, []);

  const resetTimer = useCallback(() => {
    workerRef.current?.postMessage({ command: "reset" });
  }, []);

  return useMemo(
    () => ({
      startTimer,
      stopTimer,
      seekTimer,
      resetTimer,
    }),
    [startTimer, stopTimer, seekTimer, resetTimer]
  );
};
