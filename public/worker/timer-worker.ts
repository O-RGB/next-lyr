let intervalId: any = null;
let lastTickTime: number | null = null;
let accumulatedValue = 0;
let isRunning = false;
let ppq = 480;
let mode: "tick" | "time" = "tick";
let tempoMap: { key: [number, number]; value: { value: { bpm: number } } }[] =
  [];

function findBpmForTick(tick: number): number {
  if (tempoMap.length === 0) {
    return 120;
  }

  let low = 0;
  let high = tempoMap.length - 1;
  let bestMatchBpm = 120;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const [startTick, endTick] = tempoMap[mid].key;

    if (tick >= startTick && tick < endTick) {
      return tempoMap[mid].value.value.bpm;
    }

    if (tick < startTick) {
      high = mid - 1;
    } else {
      bestMatchBpm = tempoMap[mid].value.value.bpm;
      low = mid + 1;
    }
  }

  return bestMatchBpm;
}

self.onmessage = (e: MessageEvent) => {
  const { command, value } = e.data;

  switch (command) {
    case "start":
      if (!isRunning) {
        if (value) {
          ppq = value.ppq || ppq;
          mode = value.mode || mode;
        }
        isRunning = true;
        lastTickTime = performance.now();
        intervalId = setInterval(tick, 50);
      }
      break;
    case "stop":
      if (isRunning) {
        isRunning = false;
        clearInterval(intervalId);
        intervalId = null;
        lastTickTime = null;
      }
      break;
    case "seek":
      accumulatedValue = value;
      if (!isRunning) {
        const bpm = findBpmForTick(accumulatedValue);
        self.postMessage({ type: mode, value: accumulatedValue, bpm });
      }
      break;
    case "reset":
      isRunning = false;
      clearInterval(intervalId);
      intervalId = null;
      lastTickTime = null;
      accumulatedValue = 0;
      break;

    case "getTiming":
      const currentBpm = findBpmForTick(accumulatedValue);
      self.postMessage({
        type: "timingResponse",
        value: accumulatedValue,
        bpm: currentBpm,
      });
      break;

    case "setTempoMap":
      if (value && value.tempos) {
        tempoMap = value.tempos.ranges || [];
      }
      break;
    case "updatePpq":
      if (value && typeof value.ppq === "number") {
        ppq = value.ppq;
      }
      break;
    case "updateMode":
      if (value && (value.mode === "tick" || value.mode === "time")) {
        mode = value.mode;
        accumulatedValue = 0;
      }
      break;
  }
};

function tick() {
  if (!isRunning || !lastTickTime) return;

  const now = performance.now();
  const deltaTime = now - lastTickTime;
  lastTickTime = now;
  let bpm = 120;

  if (mode === "tick") {
    bpm = findBpmForTick(accumulatedValue);
    const ticksPerSecond = (bpm * ppq) / 60;
    const elapsedTicks = (deltaTime / 1000) * ticksPerSecond;
    accumulatedValue += elapsedTicks;
  } else {
    accumulatedValue += deltaTime / 1000;
  }

  self.postMessage({ type: mode, value: accumulatedValue, bpm });
}
