/**
 * Timing protocol shared by the worker and its client.
 *
 * Every command that moves time carries a `clockTime`: the host's authoritative
 * clock, in seconds, monotonically increasing while playing. The worker never
 * accumulates elapsed time of its own — it stores an anchor and recomputes the
 * position from that clock, so the reported position cannot drift away from the
 * audio no matter how late or irregular the worker's own wakeups are.
 *
 * Which clock a host passes depends on the source it is driving:
 *   - MIDI (fluidsynth): `audioContext.currentTime`
 *   - <audio>/<video>:   `performance.now() / 1000`, re-synced from the element
 *   - YouTube:           `performance.now() / 1000`, re-synced from the iframe
 */

/** `Tick` reports MIDI ticks (for .mid/.kar), `Time` reports seconds. */
export type TimingMode = "Tick" | "Time";

export interface TimeSignature {
  tick: number;
  numerator: number;
  denominator: number;
}

export interface BeatInfo {
  measure: number;
  beat: number;
  /** Progress through the current beat, 0..1 — drives the beat indicator. */
  subBeat: number;
  numerator: number;
  denominator: number;
  /** True while the playhead is still in the intro, before the first note. */
  isPreStart: boolean;
}

export interface TempoMapEvent {
  tick: number;
  bpm: number;
}

/* ── Commands ─────────────────────────────────────────────────────────────── */

export interface StartPayload {
  clockTime: number;
  ppq?: number;
  mode?: TimingMode;
}

/** Start playback from a future AudioContext boundary. */
export interface ScheduleStartPayload {
  currentClockTime: number;
  boundaryClockTime: number;
  /** Exact source position armed at the boundary. */
  seconds?: number;
}

export interface StopPayload {
  clockTime: number;
}

/** Re-anchor without moving the playhead, after a clock/source hiccup. */
export interface SyncPayload {
  clockTime: number;
}

/**
 * Seek target. MIDI seeks by tick (that is what fluidsynth's player takes) and
 * everything else by second; the worker owns the tempo map, so it is the right
 * place to convert between them.
 */
export type SeekPayload = {
  clockTime: number;
  requestId?: number;
  /** Hold the audible/presentation cursor at this target while latency fills. */
  holdPresentation?: boolean;
} & (
  | { seconds: number; ticks?: never }
  | { ticks: number; seconds?: never }
);

export interface PlaybackRatePayload {
  clockTime: number;
  rate: number;
}

export interface PpqPayload {
  ppq: number;
}

export interface ModePayload {
  mode: TimingMode;
}

/** MIDI reports its length in ticks, media files in seconds. */
export type DurationUnit = "seconds" | "ticks";

export interface DurationPayload {
  duration: number;
  unit: DurationUnit;
}

export interface LatencyPayload {
  latency: number;
}

/** Source-clock timestamp captured at the input event, before the worker hop. */
export interface TimingRequestPayload {
  clockTime: number;
  requestId: number;
}

export interface FirstNotePayload {
  firstNote: number;
}

export interface TempoMapPayload {
  tempoChanges: TempoMapEvent[];
}

export interface TimeSignaturesPayload {
  timeSignatures: TimeSignature[];
}

export type WorkerCommand =
  | { command: "start"; value: StartPayload }
  | { command: "scheduleStart"; value: ScheduleStartPayload }
  | { command: "stop"; value: StopPayload }
  | { command: "sync"; value: SyncPayload }
  | { command: "seek"; value: SeekPayload }
  | { command: "reset" }
  | { command: "getTiming"; value?: TimingRequestPayload }
  | { command: "updatePlaybackRate"; value: PlaybackRatePayload }
  | { command: "updatePpq"; value: PpqPayload }
  | { command: "updateMode"; value: ModePayload }
  | { command: "updateDuration"; value: DurationPayload }
  | { command: "updateLatency"; value: LatencyPayload }
  | { command: "updateFirstNote"; value: FirstNotePayload }
  | { command: "updateTempoMap"; value: TempoMapPayload }
  | { command: "updateTimeSignatures"; value: TimeSignaturesPayload };

/* ── Responses ────────────────────────────────────────────────────────────── */

/** Everything the UI needs for one frame, so a tick costs a single message. */
export interface TimingSnapshot {
  /** Raw source position: ticks for `Tick`, seconds for `Time`. */
  value: number;
  /** Position the listener currently hears, in the active mode's unit. */
  presentationValue: number;
  /** Position in seconds, already latency-compensated. */
  elapsedSeconds: number;
  /** Position in seconds as the source sees it, without latency compensation. */
  rawSeconds: number;
  /** True only after the scheduled sample has reached the listener. */
  presentationRunning: boolean;
  totalSeconds: number;
  countdown: number;
  bpm: number;
  beatInfo: BeatInfo;
}

export interface TickMessage extends TimingSnapshot {
  type: "tick";
  mode: TimingMode;
}

export interface SeekResponseMessage extends TimingSnapshot {
  type: "seekResponse";
  mode: TimingMode;
  requestId?: number;
}

export interface TimingResponseMessage extends TimingSnapshot {
  type: "timingResponse";
  mode: TimingMode;
  requestId?: number;
}

export interface FinishedMessage extends TimingSnapshot {
  type: "finished";
  mode: TimingMode;
}

export type WorkerResponse =
  | TickMessage
  | SeekResponseMessage
  | TimingResponseMessage
  | FinishedMessage;
