/**
 * Timing worker.
 *
 * Runs the display loop off the main thread so lyric highlighting keeps its
 * cadence while React renders, the lyric grid scrolls, or a large MIDI is
 * parsed. It owns no clock of its own: `lastClockTime`/`lastPerfTime` let it
 * extrapolate the host clock between syncs, and every value it reports is
 * recomputed from the anchor rather than accumulated.
 */

import {
  getBeatInfo,
  getBpm,
  getCountdown,
  getElapsedSeconds,
  getPresentationDelaySeconds,
  getRawSeconds,
  getRawValue,
  getTotalSeconds,
  getValue,
  isFinished,
  isPlaying,
  isPresentationPlaying,
  mode,
  msToTick,
  ppq,
  reanchor,
  resetAnchor,
  seekAnchor,
  setDuration,
  setFirstNote,
  setLatency,
  setMode,
  setPpq,
  setTempoMap,
  setTimeSignatures,
  startAnchor,
  stopAnchor,
  tickToSeconds,
} from "./timing";
import type {
  FinishedMessage,
  SeekResponseMessage,
  TickMessage,
  TimingResponseMessage,
  TimingSnapshot,
  WorkerCommand,
} from "./types";

/** 50ms ≈ 20 updates/sec: smooth for lyrics and cheap enough for low-end phones. */
const TICK_INTERVAL_MS = 50;

let rate = 1;
let lastClockTime = 0;
let lastPerfTime = 0;
let timerId: ReturnType<typeof setTimeout> | null = null;

/**
 * Extrapolate the host clock. The host only syncs occasionally, so between
 * syncs we advance its last reading by our own elapsed wall time.
 */
function currentClockTime(): number {
  return lastClockTime + Math.max(0, (performance.now() - lastPerfTime) / 1000);
}

function markClock(clockTime: number): void {
  lastClockTime = clockTime;
  lastPerfTime = performance.now();
}

function snapshot(clockTime: number): TimingSnapshot {
  const elapsedSeconds = getElapsedSeconds(clockTime);
  // Beat position only means anything against a tick timeline.
  const beatTick = mode === "Tick" ? getValue(clockTime) : msToTick(elapsedSeconds * 1000);

  return {
    // karaoke-web-online deliberately publishes the source/sequencer value to
    // timing consumers while beat/display data uses the latency-compensated
    // presentation position below. Keeping those clocks separate is what
    // makes stamping and audible playback share one stable reference.
    value: getRawValue(clockTime),
    presentationValue: getValue(clockTime),
    elapsedSeconds,
    rawSeconds: getRawSeconds(clockTime),
    presentationRunning: isPresentationPlaying(clockTime),
    totalSeconds: getTotalSeconds(),
    countdown: getCountdown(clockTime),
    bpm: getBpm(clockTime),
    beatInfo: getBeatInfo(beatTick),
  };
}

function post(message: TickMessage | SeekResponseMessage | TimingResponseMessage | FinishedMessage): void {
  self.postMessage(message);
}

function stopLoop(): void {
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
}

function startLoop(): void {
  stopLoop();

  const run = () => {
    if (!isPlaying()) return;

    const clockTime = currentClockTime();

    if (isFinished(clockTime)) {
      stopAnchor(clockTime);
      stopLoop();
      post({
        type: "finished",
        mode,
        ...snapshot(clockTime),
        countdown: 0,
      } satisfies FinishedMessage);
      return;
    }

    post({ type: "tick", mode, ...snapshot(clockTime) } satisfies TickMessage);
    // setTimeout, not setInterval: a slow post must not queue up a backlog.
    const presentationDelayMs = getPresentationDelaySeconds(clockTime) * 1000;
    // Keep the normal cheap cadence, but wake exactly at the audible boundary
    // when it falls inside the next interval. That avoids adding another 50ms
    // of visual delay after a large audio buffer finishes filling.
    const nextDelayMs =
      presentationDelayMs > 0
        ? Math.max(1, Math.min(TICK_INTERVAL_MS, presentationDelayMs))
        : TICK_INTERVAL_MS;
    timerId = setTimeout(run, nextDelayMs);
  };

  timerId = setTimeout(run, TICK_INTERVAL_MS);
}

self.onmessage = (event: MessageEvent<WorkerCommand>): void => {
  const message = event.data;

  switch (message.command) {
    case "start": {
      const { clockTime, ppq: nextPpq, mode: nextMode } = message.value;
      if (nextPpq) setPpq(nextPpq);
      if (nextMode) setMode(nextMode);

      markClock(clockTime);
      if (isPlaying()) reanchor(clockTime, rate);
      else startAnchor(clockTime, rate);

      startLoop();
      break;
    }

    case "scheduleStart": {
      // Keep clock extrapolation anchored to now, but do not advance the
      // playback position until the future audio boundary is reached.
      const { currentClockTime, boundaryClockTime, seconds } = message.value;
      markClock(currentClockTime);
      startAnchor(boundaryClockTime, rate, seconds, true);
      startLoop();
      break;
    }

    case "stop": {
      markClock(message.value.clockTime);
      stopAnchor(message.value.clockTime);
      stopLoop();
      break;
    }

    case "sync": {
      // Re-anchor at the host's real position without moving the playhead.
      const { clockTime } = message.value;
      if (isPlaying()) reanchor(clockTime, rate);
      markClock(clockTime);
      break;
    }

    case "seek": {
      const { clockTime, requestId } = message.value;
      const seconds =
        message.value.ticks !== undefined
          ? tickToSeconds(message.value.ticks)
          : message.value.seconds;

      markClock(clockTime);
      seekAnchor(
        clockTime,
        seconds,
        message.value.holdPresentation ?? false
      );
      post({
        type: "seekResponse",
        mode,
        requestId,
        ...snapshot(clockTime),
      } satisfies SeekResponseMessage);
      break;
    }

    case "reset": {
      resetAnchor();
      markClock(0);
      stopLoop();
      break;
    }

    case "getTiming": {
      const clockTime = message.value?.clockTime ?? currentClockTime();
      post({
        type: "timingResponse",
        mode,
        ...snapshot(clockTime),
        requestId: message.value?.requestId,
      } satisfies TimingResponseMessage);
      break;
    }

    case "updatePlaybackRate": {
      const { clockTime, rate: nextRate } = message.value;
      rate = nextRate;
      reanchor(clockTime, nextRate);
      markClock(clockTime);
      break;
    }

    case "updatePpq": {
      if (message.value.ppq !== ppq) setPpq(message.value.ppq);
      break;
    }

    case "updateMode": {
      if (message.value.mode !== mode) setMode(message.value.mode);
      break;
    }

    case "updateDuration": {
      setDuration(message.value.duration, message.value.unit);
      break;
    }

    case "updateLatency": {
      setLatency(message.value.latency);
      break;
    }

    case "updateFirstNote": {
      setFirstNote(message.value.firstNote);
      break;
    }

    case "updateTempoMap": {
      setTempoMap(message.value.tempoChanges);
      break;
    }

    case "updateTimeSignatures": {
      setTimeSignatures(message.value.timeSignatures);
      break;
    }
  }
};
