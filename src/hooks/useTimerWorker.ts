import { create } from "zustand";
import { useKaraokeStore } from "../stores/karaoke-store";

type TimerMode = "Tick" | "Time";

type TimerStore = {
  worker: Worker | null;
  mode: TimerMode;
  startTimer: (params?: { mode: TimerMode; ppq?: number }) => void;
  stopTimer: () => void;
  seekTimer: (value: number) => void;
  resetTimer: () => void;
  forceStopTimer: () => void;
  initWorker: () => void;
  terminateWorker: () => void;
  updatePpq: (ppq: number) => void;
  updateDuration: (duration: number) => void;
  updateMode: (mode: TimerMode) => void;
  updateTempoMap: (tempos: any) => void;
  getCurrentTiming: () => Promise<{ value: number; bpm: number }>;
};

export const useTimerStore = create<TimerStore>((set, get) => ({
  worker: null,
  mode: "Tick",

  initWorker() {
    const karaokeActions = useKaraokeStore.getState().actions;

    const worker = new Worker(
      new URL("/public/worker/timer-worker.ts", import.meta.url)
    );

    worker.onmessage = (e: MessageEvent) => {
      const { type, value, bpm } = e.data;
      switch (type) {
        case "Tick":
        case "Time":
          karaokeActions.setCurrentTime(value);

          if (bpm !== undefined) {
            karaokeActions.setCurrentTempo(bpm);
          }

          break;
      }
    };

    get().worker = worker;
  },

  terminateWorker: () => {
    const worker = get().worker;
    if (worker) {
      worker.postMessage({ command: "stop" });
      worker.terminate();
      set({ worker: null });
    }
  },

  getCurrentTiming: () => {
    return new Promise((resolve) => {
      const worker = get().worker;
      if (!worker) {
        resolve({ value: 0, bpm: 120 });
        return;
      }

      const handleResponse = (e: MessageEvent) => {
        const { type, value, bpm } = e.data;
        if (type === "timingResponse") {
          resolve({ value, bpm });

          worker.removeEventListener("message", handleResponse);
        }
      };

      worker.addEventListener("message", handleResponse);
      worker.postMessage({ command: "getTiming" });
    });
  },

  startTimer() {
    get().worker?.postMessage({ command: "start" });
  },

  stopTimer() {
    get().worker?.postMessage({ command: "stop" });
  },

  seekTimer(value: number) {
    console.log("seeking, ", value);
    get().worker?.postMessage({ command: "seek", value: value });
  },

  resetTimer: () => {
    get().worker?.postMessage({ command: "reset" });
  },

  forceStopTimer: () => {
    const worker = get().worker;
    if (worker) {
      worker.postMessage({ command: "stop" });
      worker.postMessage({ command: "reset" });
    }
  },

  updateTempoMap(tempos: any) {
    get().worker?.postMessage({ command: "setTempoMap", value: { tempos } });
  },

  updatePpq(ppq: number) {
    get().worker?.postMessage({ command: "updatePpq", value: { ppq } });
  },
  updateDuration(duration: number) {
    get().worker?.postMessage({
      command: "updateDuration",
      value: { duration },
    });
  },

  updateMode(mode: TimerMode) {
    get().worker?.postMessage({ command: "updateMode", value: { mode } });
  },
}));
