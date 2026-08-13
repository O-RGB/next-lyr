/// <reference lib="webworker" />

/**
 * Scheduler heartbeat.
 *
 * `setInterval` on the main thread is throttled to ~1 Hz once a tab is hidden
 * or a phone locks, which would starve the note scheduler and drop everything
 * queued for the next window. Worker timers keep firing, so the look-ahead
 * loop survives being backgrounded.
 */

const scope = self as unknown as DedicatedWorkerGlobalScope;

let handle: ReturnType<typeof setInterval> | null = null;

type TimerCommand =
  | { type: "start"; intervalMs: number }
  | { type: "stop" };

scope.addEventListener("message", (event: MessageEvent<TimerCommand>) => {
  if (event.data.type === "start") {
    if (handle !== null) clearInterval(handle);
    handle = setInterval(() => scope.postMessage("tick"), event.data.intervalMs);
  } else if (handle !== null) {
    clearInterval(handle);
    handle = null;
  }
});

