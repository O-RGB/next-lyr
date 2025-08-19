import { useEffect, useRef, useCallback, useMemo } from "react";
import { useKaraokeStore } from "../stores/karaoke-store";

export const useTimerWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const actions = useKaraokeStore((state) => state.actions);
  const mode = useKaraokeStore((state) => state.mode);
  const midiInfo = useKaraokeStore((state) => state.playerState.midiInfo);
  const projectId = useKaraokeStore((state) => state.projectId);
  const isPlaying = useKaraokeStore((state) => state.isPlaying);

  useEffect(() => {
    const worker = new Worker(
      new URL("/public/worker/timer-worker.ts", import.meta.url)
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === "tick") {
        let timeValue = e.data.time;

        if (
          mode === "midi" &&
          midiInfo &&
          midiInfo.bpm > 0 &&
          midiInfo.ppq > 0
        ) {
          const converted = ((timeValue * midiInfo.bpm) / 60) * midiInfo.ppq;

          timeValue = converted;
        }

        actions.setCurrentTime(timeValue);
      }
    };

    return () => {
      worker.postMessage({ command: "stop" });
      worker.terminate();
    };
  }, [actions, mode, midiInfo]);

  useEffect(() => {
    stopTimer();
    resetTimer();
  }, [projectId, mode]);

  useEffect(() => {
    if (!isPlaying) {
      stopTimer();
    }
  }, [isPlaying]);

  const startTimer = useCallback(() => {
    workerRef.current?.postMessage({ command: "start" });
  }, []);

  const stopTimer = useCallback(() => {
    workerRef.current?.postMessage({ command: "stop" });
  }, []);

  const seekTimer = useCallback((timeInSeconds: number) => {
    workerRef.current?.postMessage({ command: "seek", value: timeInSeconds });
  }, []);

  const resetTimer = useCallback(() => {
    workerRef.current?.postMessage({ command: "reset" });
  }, []);

  const forceStopTimer = useCallback(() => {
    workerRef.current?.postMessage({ command: "stop" });
    workerRef.current?.postMessage({ command: "reset" });
  }, []);

  return useMemo(
    () => ({
      startTimer,
      stopTimer,
      seekTimer,
      resetTimer,
      forceStopTimer,
    }),
    [startTimer, stopTimer, seekTimer, resetTimer, forceStopTimer]
  );
};
