import { create } from "zustand";
import { useKaraokeStore } from "../stores/karaoke-store";

type TimerStore = {
  worker: Worker | null;
  startTimer: () => void;
  stopTimer: () => void;
  seekTimer: (timeInSeconds: number) => void;
  resetTimer: () => void;
  forceStopTimer: () => void;
  initWorker: () => void;
  terminateWorker: () => void;
};

export const useTimerStore = create<TimerStore>((set, get) => ({
  worker: null,

  initWorker: () => {
    const karaokeActions = useKaraokeStore.getState().actions;

    const worker = new Worker(
      new URL("/public/worker/timer-worker.ts", import.meta.url)
    );

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === "tick") {
        let timeValue = e.data.time;

        const mode = useKaraokeStore.getState().mode;
        const midiInfo = useKaraokeStore.getState().playerState.midiInfo;

        if (
          mode === "midi" &&
          midiInfo &&
          midiInfo.bpm > 0 &&
          midiInfo.ppq > 0
        ) {
          const converted = ((timeValue * midiInfo.bpm) / 60) * midiInfo.ppq;
          timeValue = converted;
        }

        karaokeActions.setCurrentTime(timeValue);
      }
    };

    set({ worker });
  },

  terminateWorker: () => {
    const worker = get().worker;
    if (worker) {
      worker.postMessage({ command: "stop" });
      worker.terminate();
      set({ worker: null });
    }
  },

  startTimer: () => {
    get().worker?.postMessage({ command: "start" });
  },

  stopTimer: () => {
    get().worker?.postMessage({ command: "stop" });
  },

  seekTimer: (timeInSeconds: number) => {
    get().worker?.postMessage({ command: "seek", value: timeInSeconds });
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
}));
