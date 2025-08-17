// src/workers/timer-worker.ts
let intervalId: any = null;
let lastTickTime: number | null = null;
let accumulatedTime = 0;
let isRunning = false;
const tickInterval = 100; // ms

self.onmessage = (e: MessageEvent) => {
  const { command, value } = e.data;

  switch (command) {
    case "start":
      if (!isRunning) {
        isRunning = true;
        lastTickTime = performance.now();
        intervalId = setInterval(tick, tickInterval);
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
      accumulatedTime = value;
      if (!isRunning) {
        self.postMessage({ type: "tick", time: accumulatedTime });
      }
      break;
    case "reset":
      isRunning = false;
      clearInterval(intervalId);
      intervalId = null;
      lastTickTime = null;
      accumulatedTime = 0;
      break;
  }
};

function tick() {
  if (!isRunning || !lastTickTime) return;

  const now = performance.now();
  const deltaTime = now - lastTickTime;
  lastTickTime = now;
  accumulatedTime += deltaTime / 1000; // convert ms to seconds

  self.postMessage({ type: "tick", time: accumulatedTime });
}
