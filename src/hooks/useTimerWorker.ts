// src/hooks/useTimerWorker.ts
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
    console.log("[useTimerWorker] Initializing worker...");
    const worker = new Worker(
      new URL("/public/worker/timer-worker.ts", import.meta.url)
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      console.log("[useTimerWorker] Worker message received:", e.data);

      if (e.data.type === "tick") {
        let timeValue = e.data.time; // Time from worker is always in seconds
        console.log("[useTimerWorker] Tick received (seconds):", timeValue);

        if (
          mode === "midi" &&
          midiInfo &&
          midiInfo.bpm > 0 &&
          midiInfo.ppq > 0
        ) {
          const converted = ((timeValue * midiInfo.bpm) / 60) * midiInfo.ppq;
          console.log(
            "[useTimerWorker] Converted seconds → ticks:",
            converted,
            "(bpm:",
            midiInfo.bpm,
            "ppq:",
            midiInfo.ppq,
            ")"
          );
          timeValue = converted;
        }

        console.log("[useTimerWorker] Setting currentTime →", timeValue);
        actions.setCurrentTime(timeValue);
      }
    };

    return () => {
      console.log("[useTimerWorker] Terminating worker...");
      // หยุด worker ก่อน terminate
      worker.postMessage({ command: "stop" });
      worker.terminate();
    };
  }, [actions, mode, midiInfo]);

  // หยุด timer เมื่อ projectId หรือ mode เปลี่ยน
  useEffect(() => {
    console.log("[useTimerWorker] Project or mode changed, stopping timer");
    stopTimer();
    resetTimer();
  }, [projectId, mode]);

  // หยุด timer เมื่อเพลงไม่ได้เล่น
  useEffect(() => {
    if (!isPlaying) {
      console.log("[useTimerWorker] Player is not playing, stopping timer");
      stopTimer();
    }
  }, [isPlaying]);

  const startTimer = useCallback(() => {
    console.log("[useTimerWorker] startTimer called");
    workerRef.current?.postMessage({ command: "start" });
  }, []);

  const stopTimer = useCallback(() => {
    console.log("[useTimerWorker] stopTimer called");
    workerRef.current?.postMessage({ command: "stop" });
  }, []);

  const seekTimer = useCallback((timeInSeconds: number) => {
    console.log(
      "[useTimerWorker] seekTimer called with seconds:",
      timeInSeconds
    );
    workerRef.current?.postMessage({ command: "seek", value: timeInSeconds });
  }, []);

  const resetTimer = useCallback(() => {
    console.log("[useTimerWorker] resetTimer called");
    workerRef.current?.postMessage({ command: "reset" });
  }, []);

  // เพิ่ม method เพื่อบังคับหยุด timer
  const forceStopTimer = useCallback(() => {
    console.log("[useTimerWorker] forceStopTimer called");
    workerRef.current?.postMessage({ command: "stop" });
    workerRef.current?.postMessage({ command: "reset" });
  }, []);

  return useMemo(
    () => ({
      startTimer,
      stopTimer,
      seekTimer,
      resetTimer,
      forceStopTimer, // เพิ่ม method นี้
    }),
    [startTimer, stopTimer, seekTimer, resetTimer, forceStopTimer]
  );
};
