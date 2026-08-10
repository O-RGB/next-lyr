// Types
type TimingMode = "Tick" | "Time";

interface TempoMapEntry {
  key: [number, number]; // [startTick, endTick]
  value: {
    value: {
      bpm: number;
    };
  };
}

interface StartCommandPayload {
  ppq?: number;
  mode?: TimingMode;
}

interface SeekCommandPayload {
  value: number;
}

// Alternative interface for direct value
type SeekValue = number;

interface TempoMapCommandPayload {
  tempos: {
    ranges: TempoMapEntry[];
  };
}

interface PpqCommandPayload {
  ppq: number;
}

interface ModeCommandPayload {
  mode: TimingMode;
}

interface DurationCommandPayload {
  duration: number;
}

type WorkerCommandPayload =
  | StartCommandPayload
  | SeekCommandPayload
  | TempoMapCommandPayload
  | PpqCommandPayload
  | ModeCommandPayload
  | DurationCommandPayload
  | SeekValue // Support direct number for seek
  | undefined;

interface WorkerMessage {
  command:
    | "start"
    | "stop"
    | "seek"
    | "reset"
    | "getTiming"
    | "setTempoMap"
    | "updatePpq"
    | "updateMode"
    | "updateDuration";
  value?: WorkerCommandPayload;
}

interface TimingMessage {
  type: TimingMode;
  value: number;
  bpm: number;
  countdown: number;
}

interface TimingResponseMessage {
  type: "timingResponse";
  value: number;
  bpm: number;
  remainingTime: number;
}

type WorkerResponseMessage = TimingMessage | TimingResponseMessage;

// Worker State
let intervalId: ReturnType<typeof setInterval> | null = null;
let lastTickTime: number | null = null;
let accumulatedValue: number = 0;
let isRunning: boolean = false;
let ppq: number = 480;
let mode: TimingMode = "Time";
let tempoMap: TempoMapEntry[] = [];
let duration: number | null = null;

// Tracking variables
let lastCountdownValue: number = -1;
let lastTickValueSent: number = -1;

// Cache variables
let cachedBpm: number = 120;
let lastBpmLookupTick: number = -1;
let cachedTicksPerSecond: number = 0;

/**
 * Find BPM for a specific tick using binary search with caching
 */
function findBpmForTick(tick: number): number {
  const flooredTick = Math.floor(tick);

  if (flooredTick === lastBpmLookupTick) {
    return cachedBpm;
  }

  if (tempoMap.length === 0) {
    cachedBpm = 120;
    lastBpmLookupTick = flooredTick;
    return cachedBpm;
  }

  let low = 0;
  let high = tempoMap.length - 1;
  let bestMatchBpm = 120;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const [startTick, endTick] = tempoMap[mid].key;

    if (tick >= startTick && tick < endTick) {
      cachedBpm = tempoMap[mid].value.value.bpm;
      lastBpmLookupTick = flooredTick;
      return cachedBpm;
    }

    if (tick < startTick) {
      high = mid - 1;
    } else {
      bestMatchBpm = tempoMap[mid].value.value.bpm;
      low = mid + 1;
    }
  }

  cachedBpm = bestMatchBpm;
  lastBpmLookupTick = flooredTick;
  return cachedBpm;
}

/**
 * Calculate remaining time based on current mode
 */
function getRemainingTime(): number {
  if (duration === null) return 0;

  if (mode === "Time") {
    const remaining = Math.max(0, duration - accumulatedValue);
    return isFinite(remaining) ? remaining : 0;
  } else {
    const remainingTicks = Math.max(0, duration - accumulatedValue);

    if (
      cachedTicksPerSecond === 0 ||
      Math.floor(accumulatedValue) !== lastBpmLookupTick
    ) {
      const bpm = findBpmForTick(accumulatedValue);
      cachedTicksPerSecond = (bpm * ppq) / 60;
    }

    const timeRemaining =
      cachedTicksPerSecond > 0 ? remainingTicks / cachedTicksPerSecond : 0;
    return isFinite(timeRemaining) ? timeRemaining : 0;
  }
}

/**
 * Invalidate all cached values
 */
function invalidateCache(): void {
  lastBpmLookupTick = -1;
  cachedTicksPerSecond = 0;
}

function getTicksPerSecond(tick: number): number {
  const bpm = findBpmForTick(tick);
  cachedTicksPerSecond = Math.max(0, (bpm * ppq) / 60);
  return cachedTicksPerSecond;
}

/**
 * Advance ticks using the tempo map instead of assuming one BPM for the
 * entire interval. This keeps an exact timing request accurate even when the
 * worker has not run its next 50ms display update yet.
 */
function advanceTicks(startTick: number, elapsedSeconds: number): number {
  let tick = startTick;
  let remainingSeconds = Math.max(0, elapsedSeconds);

  while (remainingSeconds > 0) {
    const ticksPerSecond = getTicksPerSecond(tick);
    if (ticksPerSecond <= 0) return tick;

    const nextTempoTick = tempoMap.find(
      (entry) => entry.key[0] > tick
    )?.key[0];
    const secondsToTempoChange =
      nextTempoTick === undefined
        ? Number.POSITIVE_INFINITY
        : Math.max(0, (nextTempoTick - tick) / ticksPerSecond);

    const stepSeconds = Math.min(remainingSeconds, secondsToTempoChange);
    tick += stepSeconds * ticksPerSecond;
    remainingSeconds -= stepSeconds;

    if (!Number.isFinite(secondsToTempoChange) || stepSeconds < secondsToTempoChange) {
      break;
    }

    if (stepSeconds === 0) break;
  }

  return tick;
}

function getValueAt(now: number): number {
  if (!isRunning || lastTickTime === null) return accumulatedValue;

  const elapsedSeconds = Math.max(0, (now - lastTickTime) / 1000);
  return mode === "Tick"
    ? advanceTicks(accumulatedValue, elapsedSeconds)
    : accumulatedValue + elapsedSeconds;
}

function syncValueToNow(): number {
  const now = performance.now();
  accumulatedValue = getValueAt(now);
  if (isRunning) lastTickTime = now;
  return accumulatedValue;
}

/**
 * Stop the timing interval
 */
function stopTick(): void {
  syncValueToNow();
  isRunning = false;

  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }

  lastTickTime = null;
  lastCountdownValue = -1;
}

/**
 * Main tick function called every 50ms
 */
function tick(): void {
  if (!isRunning || lastTickTime === null) return;

  const now = performance.now();
  accumulatedValue = getValueAt(now);
  lastTickTime = now;

  let bpm = cachedBpm;

  if (mode === "Tick") bpm = findBpmForTick(accumulatedValue);

  // Validate accumulated value
  if (isNaN(accumulatedValue) || !isFinite(accumulatedValue)) {
    console.error(
      "Invalid accumulatedValue:",
      accumulatedValue,
      "mode:",
      mode
    );
    accumulatedValue = 0;
  }

  // Check if we've reached the duration limit
  if (duration !== null && accumulatedValue >= duration) {
    accumulatedValue = duration;

    const finalMessage: TimingMessage = {
      type: mode,
      value: accumulatedValue,
      bpm,
      countdown: 0,
    };

    self.postMessage(finalMessage);
    stopTick();
    return;
  }

  const remainingTime = getRemainingTime();
  let currentCountdownValue =
    remainingTime > 10 ? 10 : Math.ceil(remainingTime);

  // Validate countdown value
  if (isNaN(currentCountdownValue) || !isFinite(currentCountdownValue)) {
    console.error(
      "Invalid countdown:",
      currentCountdownValue,
      "remainingTime:",
      remainingTime,
      "duration:",
      duration,
      "accumulatedValue:",
      accumulatedValue
    );
    currentCountdownValue =
      duration !== null
        ? Math.max(0, Math.ceil(duration - accumulatedValue))
        : 0;
  }

  // Send messages based on mode
  if (mode === "Time") {
    // Time mode: send message every 50ms
    const message: TimingMessage = {
      type: mode,
      value: accumulatedValue,
      bpm,
      countdown: currentCountdownValue,
    };
    self.postMessage(message);
  } else {
    // Tick mode: send message only when values change
    const currentTickValue = Math.floor(accumulatedValue);

    if (
      currentTickValue !== lastTickValueSent ||
      currentCountdownValue !== lastCountdownValue
    ) {
      const message: TimingMessage = {
        type: mode,
        value: accumulatedValue,
        bpm,
        countdown: currentCountdownValue,
      };
      self.postMessage(message);
      lastTickValueSent = currentTickValue;
    }
  }

  lastCountdownValue = currentCountdownValue;
}

// Message handler
self.onmessage = (e: MessageEvent<WorkerMessage>): void => {
  const { command, value } = e.data;

  switch (command) {
    case "start": {
      if (!isRunning) {
        const startValue = value as StartCommandPayload | undefined;

        if (startValue) {
          if (startValue.ppq && startValue.ppq !== ppq) {
            ppq = startValue.ppq;
            invalidateCache();
          }
          mode = startValue.mode || mode;
        }

        isRunning = true;
        lastTickTime = performance.now();
        intervalId = setInterval(tick, 50);
      }
      break;
    }

    case "stop": {
      stopTick();
      break;
    }

    case "seek": {
      // Support both direct number and object payload
      let seekValue: number;

      if (typeof value === "number") {
        seekValue = value;
      } else if (
        value &&
        typeof (value as SeekCommandPayload).value === "number"
      ) {
        seekValue = (value as SeekCommandPayload).value;
      } else {
        console.error("Invalid seek value:", value);
        break;
      }

      console.log("Seeking to:", seekValue);
      accumulatedValue = seekValue;
      invalidateCache();
      lastCountdownValue = -1;
      lastTickValueSent = -1; // Reset tick tracking
      lastTickTime = isRunning ? performance.now() : null;

      // Always send message after seek (whether running or not)
      const bpm = findBpmForTick(accumulatedValue);
      const remainingTime = getRemainingTime();
      const countdownValue = remainingTime > 10 ? 10 : Math.ceil(remainingTime);

      const message: TimingMessage = {
        type: mode,
        value: accumulatedValue,
        bpm,
        countdown: countdownValue,
      };

      console.log("Sending seek message:", message);
      self.postMessage(message);
      break;
    }

    case "reset": {
      stopTick();
      accumulatedValue = 0;
      duration = null;
      lastCountdownValue = -1;
      invalidateCache();
      break;
    }

    case "getTiming": {
      syncValueToNow();
      const currentBpm = findBpmForTick(accumulatedValue);
      const remainingTime = getRemainingTime();

      const response: TimingResponseMessage = {
        type: "timingResponse",
        value: accumulatedValue,
        bpm: currentBpm,
        remainingTime: remainingTime,
      };
      self.postMessage(response);
      break;
    }

    case "setTempoMap": {
      const tempoValue = value as TempoMapCommandPayload;
      if (tempoValue && tempoValue.tempos) {
        tempoMap = tempoValue.tempos.ranges || [];
        invalidateCache();
      }
      break;
    }

    case "updatePpq": {
      const ppqValue = value as PpqCommandPayload;
      if (
        ppqValue &&
        typeof ppqValue.ppq === "number" &&
        ppqValue.ppq !== ppq
      ) {
        ppq = ppqValue.ppq;
        invalidateCache();
      }
      break;
    }

    case "updateMode": {
      const modeValue = value as ModeCommandPayload;
      if (
        modeValue &&
        (modeValue.mode === "Tick" || modeValue.mode === "Time") &&
        modeValue.mode !== mode
      ) {
        mode = modeValue.mode;
        accumulatedValue = 0;
        lastCountdownValue = -1;
        invalidateCache();
      }
      break;
    }

    case "updateDuration": {
      const durationValue = value as DurationCommandPayload;
      if (durationValue && typeof durationValue.duration === "number") {
        duration = durationValue.duration;
        lastCountdownValue = -1;
      }
      break;
    }
  }
};

// Export types for external use (if needed)
export type {
  TimingMode,
  TempoMapEntry,
  WorkerMessage,
  TimingMessage,
  TimingResponseMessage,
  WorkerResponseMessage,
};
