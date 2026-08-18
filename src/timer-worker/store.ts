"use client";

import { create } from "zustand";

import type { ArrayRange } from "@/lib/array-range";
import type { TempoEvent, TimeSignatureEvent } from "@/lib/karaoke/midi/types";
import { useKaraokeStore } from "@/stores/karaoke-store";

import type {
  BeatInfo,
  DurationUnit,
  TempoMapEvent,
  TimingMode,
  TimingSnapshot,
  WorkerCommand,
  WorkerResponse,
} from "./types";

/**
 * How often to re-anchor the worker against the source's own clock. Media
 * elements and the YouTube iframe drift a little from wall time (buffering, rate
 * rounding); a periodic sync corrects that without the worker ever guessing.
 */
const SYNC_INTERVAL_MS = 2_000;
/** React controls do not need the worker's 20Hz transport cadence. */
const UI_MIRROR_INTERVAL_MS = 1_000;

const DEFAULT_BEAT: BeatInfo = {
  measure: 1,
  beat: 1,
  subBeat: 0,
  numerator: 4,
  denominator: 4,
  isPreStart: true,
};

/** Reads the host's authoritative clock, in seconds. */
export type ClockSource = () => number;

/** Reports where the source actually is, in seconds, for periodic re-sync. */
export type PositionSource = () => number | null;

interface InitOptions {
  mode: TimingMode;
  /** Defaults to wall time, which is right for anything not on an AudioContext. */
  clock?: ClockSource;
  /**
   * When given, the timer re-syncs to this position every couple of seconds so
   * a buffering `<audio>` or a throttled YouTube iframe cannot slide out of sync
   * with the lyrics.
   */
  position?: PositionSource;
}

interface TimerState extends TimingSnapshot {
  /** Coarse values intended for React controls, not the render clock. */
  displayValue: number;
  displayBpm: number;
  worker: Worker | null;
  mode: TimingMode;
  isRunning: boolean;

  initWorker: (options: InitOptions) => void;
  terminateWorker: () => void;

  startTimer: () => void;
  /** Start against a future source-clock boundary (sample-accurate audio start). */
  startTimerAt: (clockTime: number) => void;
  scheduleStartAt: (boundaryClockTime: number, seconds?: number) => void;
  stopTimer: () => void;
  /** Seek by seconds — for `<audio>`, `<video>` and YouTube. */
  seekTimer: (seconds: number) => void;
  /** Seek by MIDI tick — for the fluidsynth player. */
  seekTicks: (ticks: number) => void;
  seekTimerAt: (seconds: number, clockTime: number) => void;
  seekTicksAt: (ticks: number, clockTime: number) => void;
  resetTimer: () => void;
  forceStopTimer: () => void;

  updateMode: (mode: TimingMode) => void;
  updatePpq: (ppq: number) => void;
  updateDuration: (duration: number, unit: DurationUnit) => void;
  updateLatency: (latency: number) => void;
  updateFirstNote: (firstNote: number) => void;
  updateTempoMap: (tempos: ArrayRange<TempoEvent> | TempoMapEvent[]) => void;
  updateTimeSignatures: (signatures: TimeSignatureEvent[]) => void;
  updatePlaybackRate: (rate: number) => void;

  getCurrentTiming: () => Promise<TimingSnapshot>;
}

const wallClock: ClockSource = () => performance.now() / 1000;

/** Flatten the editor's `ArrayRange` tempo container into plain events. */
function toTempoEvents(
  tempos: ArrayRange<TempoEvent> | TempoMapEvent[]
): TempoMapEvent[] {
  if (Array.isArray(tempos)) return tempos;
  return tempos.ranges.map((range) => ({
    tick: range.key[0],
    bpm: range.value.value.bpm,
  }));
}

const EMPTY_SNAPSHOT: TimingSnapshot = {
  value: 0,
  presentationValue: 0,
  elapsedSeconds: 0,
  rawSeconds: 0,
  presentationRunning: false,
  totalSeconds: 0,
  countdown: 0,
  bpm: 120,
  beatInfo: DEFAULT_BEAT,
};

export const useTimerStore = create<TimerState>((set, get) => {
  let clock: ClockSource = wallClock;
  let position: PositionSource | null = null;
  let syncTimer: ReturnType<typeof setInterval> | null = null;
  let timingRequestId = 0;
  let lastUiMirrorAt = Number.NEGATIVE_INFINITY;
  let lastUiTime: number | undefined;
  let lastUiTempo: number | undefined;

  const send = (message: WorkerCommand) => {
    get().worker?.postMessage(message);
  };

  const mirrorSnapshotToEditor = (
    snapshot: TimingSnapshot,
    force = false
  ): void => {
    const now = performance.now();
    const shouldMirrorTime =
      force || now - lastUiMirrorAt >= UI_MIRROR_INTERVAL_MS;
    const displayPatch: Partial<Pick<TimerState, "displayValue" | "displayBpm">> = {};

    if (shouldMirrorTime) {
      if (snapshot.value !== lastUiTime) {
        displayPatch.displayValue = snapshot.value;
        lastUiTime = snapshot.value;
      }
      lastUiMirrorAt = now;
    }

    // Tempo changes are sparse. Publish them immediately without waking the
    // clock display on every worker message.
    if (snapshot.bpm !== lastUiTempo) {
      displayPatch.displayBpm = snapshot.bpm;
      lastUiTempo = snapshot.bpm;
    }

    if (Object.keys(displayPatch).length > 0) set(displayPatch);

    // Seek/reset/stop are discrete editor events, so keep the legacy value in
    // sync there. Normal playback never enters this branch.
    if (force) {
      const actions = useKaraokeStore.getState().actions;
      actions.setCurrentTime(snapshot.value);
      actions.setCurrentTempo(snapshot.bpm);
    }
  };

  const resetUiMirror = (): void => {
    lastUiMirrorAt = Number.NEGATIVE_INFINITY;
    lastUiTime = undefined;
    lastUiTempo = undefined;
  };

  const applySnapshot = (snapshot: TimingSnapshot, forceUi = false) => {
    set(snapshot);
    // Keep the high-frequency timer store for canvas/render-clock consumers,
    // but mirror legacy React UI state at a deliberately human cadence.
    mirrorSnapshotToEditor(snapshot, forceUi);
  };

  const stopSyncLoop = () => {
    if (syncTimer !== null) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
  };

  const startSyncLoop = () => {
    stopSyncLoop();
    if (!position) return;

    syncTimer = setInterval(() => {
      if (!get().isRunning) return;
      const actual = position?.();
      if (actual === null || actual === undefined || !Number.isFinite(actual)) return;
      // Re-anchor onto the source's real position rather than nudging.
      send({
        command: "seek",
        value: { clockTime: clock(), seconds: actual },
      });
    }, SYNC_INTERVAL_MS);
  };

  return {
    worker: null,
    mode: "Tick",
    isRunning: false,
    displayValue: 0,
    displayBpm: 120,
    ...EMPTY_SNAPSHOT,

    initWorker: ({ mode, clock: clockSource, position: positionSource }) => {
      get().terminateWorker();
      resetUiMirror();

      clock = clockSource ?? wallClock;
      position = positionSource ?? null;

      const worker = new Worker(new URL("./worker.ts", import.meta.url));

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;
        switch (message.type) {
          case "tick":
            // A worker tick may already be in the postMessage queue when the
            // transport is paused. Do not let that stale frame turn
            // presentationRunning back on after stopTimer() has synchronously
            // frozen the UI.
            if (!get().isRunning) break;
            applySnapshot(message);
            break;
          case "seekResponse": {
            applySnapshot(message, true);
            break;
          }
          case "timingResponse": {
            // Keyboard stamping consumes this exact response directly. It
            // must not turn every key press into a React UI update.
            applySnapshot(message);
            break;
          }
          case "finished": {
            // The same queue race applies to the terminal message: an old
            // playback must not move a newly paused UI to the song's end.
            if (!get().isRunning) break;
            set({ isRunning: false });
            applySnapshot(message, true);
            useKaraokeStore.getState().actions.setIsPlaying(false);
            break;
          }
        }
      };

      set({ worker, mode, ...EMPTY_SNAPSHOT });
      applySnapshot(EMPTY_SNAPSHOT, true);
      worker.postMessage({
        command: "updateMode",
        value: { mode },
      } satisfies WorkerCommand);
    },

    terminateWorker: () => {
      stopSyncLoop();
      const worker = get().worker;
      if (!worker) return;
      worker.onmessage = null;
      worker.terminate();
      set({ worker: null, isRunning: false, presentationRunning: false });
    },

    startTimer: () => {
      set({ isRunning: true, presentationRunning: false });
      send({ command: "start", value: { clockTime: clock() } });
      startSyncLoop();
    },

    startTimerAt: (clockTime) => {
      const currentClockTime = clock();
      set({ isRunning: true, presentationRunning: false });
      send({
        command: "scheduleStart",
        value: { currentClockTime, boundaryClockTime: clockTime },
      });
      startSyncLoop();
    },

    scheduleStartAt: (boundaryClockTime, seconds) => {
      const currentClockTime = clock();
      set({ isRunning: true, presentationRunning: false });
      send({
        command: "scheduleStart",
        value: { currentClockTime, boundaryClockTime, seconds },
      });
      startSyncLoop();
    },

    stopTimer: () => {
      set({ isRunning: false, presentationRunning: false });
      mirrorSnapshotToEditor(get(), true);
      stopSyncLoop();
      send({ command: "stop", value: { clockTime: clock() } });
    },

    seekTimer: (seconds) => {
      send({
        command: "seek",
        value: { clockTime: clock(), seconds, holdPresentation: true },
      });
    },

    seekTicks: (ticks) => {
      send({
        command: "seek",
        value: { clockTime: clock(), ticks, holdPresentation: true },
      });
    },

    seekTimerAt: (seconds, clockTime) => {
      const currentClockTime = clock();
      // Set the target against "now" first, then arm that frozen target at
      // the future boundary. Marking the worker clock itself as a future value
      // makes it extrapolate immediately and recreates the early-start bug.
      send({
        command: "seek",
        value: {
          clockTime: currentClockTime,
          seconds,
          holdPresentation: true,
        },
      });
      send({
        command: "scheduleStart",
        value: { currentClockTime, boundaryClockTime: clockTime },
      });
    },

    seekTicksAt: (ticks, clockTime) => {
      const currentClockTime = clock();
      send({
        command: "seek",
        value: {
          clockTime: currentClockTime,
          ticks,
          holdPresentation: true,
        },
      });
      send({
        command: "scheduleStart",
        value: { currentClockTime, boundaryClockTime: clockTime },
      });
    },

    resetTimer: () => {
      resetUiMirror();
      set({ isRunning: false, ...EMPTY_SNAPSHOT });
      mirrorSnapshotToEditor(EMPTY_SNAPSHOT, true);
      stopSyncLoop();
      send({ command: "reset" });
    },

    forceStopTimer: () => {
      resetUiMirror();
      set({ isRunning: false, ...EMPTY_SNAPSHOT });
      mirrorSnapshotToEditor(EMPTY_SNAPSHOT, true);
      stopSyncLoop();
      send({ command: "stop", value: { clockTime: clock() } });
      send({ command: "reset" });
    },

    updateMode: (mode) => {
      set({ mode });
      send({ command: "updateMode", value: { mode } });
    },

    // Ordering note: ppq rescales the tempo and meter tables, so the worker
    // rebuilds them whenever it changes — callers may send these in any order.
    updatePpq: (ppq) => send({ command: "updatePpq", value: { ppq } }),

    updateDuration: (duration, unit) =>
      send({ command: "updateDuration", value: { duration, unit } }),

    updateLatency: (latency) =>
      send({ command: "updateLatency", value: { latency } }),

    updateFirstNote: (firstNote) =>
      send({ command: "updateFirstNote", value: { firstNote } }),

    updateTempoMap: (tempos) =>
      send({
        command: "updateTempoMap",
        value: { tempoChanges: toTempoEvents(tempos) },
      }),

    updateTimeSignatures: (timeSignatures) =>
      send({ command: "updateTimeSignatures", value: { timeSignatures } }),

    updatePlaybackRate: (rate) =>
      send({
        command: "updatePlaybackRate",
        value: { clockTime: clock(), rate },
      }),

    getCurrentTiming: () =>
      new Promise<TimingSnapshot>((resolve) => {
        const worker = get().worker;
        if (!worker) {
          resolve(EMPTY_SNAPSHOT);
          return;
        }

        // Capture the authoritative source clock synchronously with the input
        // event. Worker/message latency must never move a recorded stamp.
        const requestId = ++timingRequestId;
        const clockTime = clock();

        const handle = (event: MessageEvent<WorkerResponse>) => {
          if (
            event.data.type !== "timingResponse" ||
            event.data.requestId !== requestId
          ) {
            return;
          }
          worker.removeEventListener("message", handle);
          resolve(event.data);
        };

        worker.addEventListener("message", handle);
        worker.postMessage({
          command: "getTiming",
          value: { clockTime, requestId },
        } satisfies WorkerCommand);
      }),
  };
});
