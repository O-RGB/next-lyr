/**
 * The timing model. Pure state plus pure-ish readers — no messaging, no timers.
 *
 * The whole design rests on one idea: never accumulate. `anchor` remembers a
 * (clockTime, seconds) pair, and every reader recomputes `seconds` from the
 * clock the caller passes in. A late wakeup, a throttled background tab or a
 * garbage-collection pause therefore costs nothing: the next read lands exactly
 * where the audio is, instead of a little further behind every time.
 */

import type {
  BeatInfo,
  DurationUnit,
  TempoMapEvent,
  TimeSignature,
  TimingMode,
} from "./types";

interface Anchor {
  /** Host clock reading when the anchor was set. */
  clockTime: number;
  /** Playback position, in seconds, at that clock reading. */
  seconds: number;
  rate: number;
  playing: boolean;
}

let anchor: Anchor = {
  clockTime: 0,
  seconds: 0,
  rate: 1,
  playing: false,
};

// A direct seek starts the source at the requested position, then waits for
// the render/output pipeline to deliver that sample. During that fill there
// is silence, not audio from before the target, so the presentation cursor
// must stay on the requested position instead of subtracting latency into the
// previous beat/line.
let presentationFloorSeconds: number | null = null;

export let mode: TimingMode = "Tick";
export let ppq = 480;
export let latency = 0;
export let firstNote = 0;

/**
 * Song length. MIDI reports it in ticks and media files in seconds, so the unit
 * travels with the value and the conversion happens on read — by which time the
 * tempo map is guaranteed to be loaded.
 */
let duration: number | null = null;
let durationUnit: DurationUnit = "seconds";

/** Fallback tempo used only when no tempo map has been supplied. */
let microsecondsPerQuarter = 500_000;

/** Raw input kept so a later ppq change can rebuild the derived tables. */
let rawTempoChanges: TempoMapEvent[] = [];
let rawTimeSignatures: TimeSignature[] = [];

interface TempoSegment {
  tick: number;
  /** Milliseconds from the start of the song at which this segment begins. */
  ms: number;
  ticksPerMs: number;
  bpm: number;
}

let tempoMap: TempoSegment[] = [];

interface ProcessedTimeSignature extends TimeSignature {
  startMeasure: number;
}

let timeSignatures: ProcessedTimeSignature[] = [
  { tick: 0, numerator: 4, denominator: 4, startMeasure: 1 },
];

/* ── Setters ──────────────────────────────────────────────────────────────── */

export function setPpq(value: number): void {
  ppq = value;
  // Both derived tables are scaled by ppq, so both have to be rebuilt — a ppq
  // that arrives after the tempo map would otherwise leave it silently wrong.
  setTempoMap(rawTempoChanges);
  setTimeSignatures(rawTimeSignatures);
}

export function setMode(value: TimingMode): void {
  mode = value;
}

export function setDuration(value: number, unit: DurationUnit): void {
  duration = value;
  durationUnit = unit;
}

export function setTempo(value: number): void {
  microsecondsPerQuarter = value;
}

export function setLatency(value: number): void {
  latency = Math.max(0, Number.isFinite(value) ? value : 0);
}

export function setFirstNote(tick: number): void {
  firstNote = tick;
}

/**
 * Precompute a tempo map keyed by elapsed milliseconds.
 *
 * Converting seconds→ticks by walking tempo changes on every read would be both
 * slow and drift-prone. Instead each segment stores the millisecond offset at
 * which it starts, so a lookup is one search plus one multiply.
 */
export function setTempoMap(changes: TempoMapEvent[]): void {
  rawTempoChanges = changes;

  const sorted = [...changes]
    .filter((entry) => Number.isFinite(entry.tick) && entry.bpm > 0)
    .sort((a, b) => a.tick - b.tick);

  if (sorted.length === 0 || sorted[0].tick !== 0) {
    sorted.unshift({ tick: 0, bpm: 120 });
  }

  const map: TempoSegment[] = [];
  let accumulatedMs = 0;

  for (let i = 0; i < sorted.length; i++) {
    const bpm = sorted[i].bpm || 120;
    const ticksPerMs = (ppq * bpm) / 60_000;
    map.push({ tick: sorted[i].tick, ms: accumulatedMs, ticksPerMs, bpm });

    if (i + 1 < sorted.length) {
      accumulatedMs += (sorted[i + 1].tick - sorted[i].tick) / ticksPerMs;
    }
  }

  tempoMap = map;
}

/**
 * Time signatures carry a precomputed `startMeasure` so beat lookup is O(1)
 * per segment rather than a walk from the top of the song.
 */
export function setTimeSignatures(signatures: TimeSignature[]): void {
  rawTimeSignatures = signatures ?? [];

  if (!signatures || signatures.length === 0) {
    timeSignatures = [{ tick: 0, numerator: 4, denominator: 4, startMeasure: 1 }];
    return;
  }

  const sorted = [...signatures].sort((a, b) => a.tick - b.tick);
  if (sorted[0].tick > 0) {
    sorted.unshift({ tick: 0, numerator: 4, denominator: 4 });
  }

  const processed: ProcessedTimeSignature[] = [];
  let measure = 1;

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const previous = processed[i - 1];
      const ticksPerBeat = ppq * (4 / previous.denominator);
      const ticksPerMeasure = ticksPerBeat * previous.numerator;
      measure += (sorted[i].tick - previous.tick) / ticksPerMeasure;
      // A meter change always starts a fresh bar; the epsilon absorbs the
      // rounding error of an odd-length final measure so we don't skip one.
      measure = Math.ceil(measure - 0.01);
    }
    processed.push({ ...sorted[i], startMeasure: measure });
  }

  timeSignatures = processed;
}

/* ── Anchor control ───────────────────────────────────────────────────────── */

export function startAnchor(
  clockTime: number,
  rate: number,
  seconds = anchor.seconds,
  holdPresentation = false
): void {
  anchor = { clockTime, seconds, rate, playing: true };
  if (holdPresentation) {
    presentationFloorSeconds = Math.max(0, seconds);
  }
}

export function stopAnchor(clockTime: number): void {
  anchor = {
    clockTime,
    seconds: computeSeconds(clockTime),
    rate: anchor.rate,
    playing: false,
  };
}

export function seekAnchor(
  clockTime: number,
  seconds: number,
  holdPresentation = false
): void {
  anchor = { clockTime, seconds, rate: anchor.rate, playing: anchor.playing };
  if (holdPresentation) {
    presentationFloorSeconds = Math.max(0, seconds);
  }
}

/** Re-anchor at the current position, so a rate change applies from here on. */
export function reanchor(clockTime: number, rate: number): void {
  anchor = {
    clockTime,
    seconds: computeSeconds(clockTime),
    rate,
    playing: anchor.playing,
  };
}

export function resetAnchor(): void {
  anchor = { clockTime: 0, seconds: 0, rate: anchor.rate, playing: false };
  presentationFloorSeconds = null;
}

export function isPlaying(): boolean {
  return anchor.playing;
}

/**
 * The source is armed at `anchor.clockTime`, but the listener receives its
 * first sample only after the render/output latency has elapsed.
 */
export function isPresentationPlaying(clockTime: number): boolean {
  return anchor.playing && clockTime >= anchor.clockTime + latency;
}

/** Time remaining until the first scheduled sample reaches the listener. */
export function getPresentationDelaySeconds(clockTime: number): number {
  if (!anchor.playing) return 0;
  return Math.max(0, anchor.clockTime + latency - clockTime);
}

export function getRate(): number {
  return anchor.rate;
}

function computeSeconds(clockTime: number): number {
  if (!anchor.playing) return anchor.seconds;
  const elapsed = Math.max(0, clockTime - anchor.clockTime);
  return anchor.seconds + elapsed * anchor.rate;
}

/* ── Readers ──────────────────────────────────────────────────────────────── */

/**
 * Convert elapsed milliseconds to ticks through the tempo map.
 *
 * This is what keeps tick mode honest: ticks are always derived from real time,
 * never advanced by adding "ticks per frame", so a tempo change mid-song cannot
 * accumulate error.
 */
export function msToTick(ms: number): number {
  if (tempoMap.length === 0) {
    const bpm = 60_000_000 / microsecondsPerQuarter;
    return (ms * (ppq * bpm)) / 60_000;
  }

  let segment = tempoMap[0];
  for (let i = tempoMap.length - 1; i >= 0; i--) {
    if (ms >= tempoMap[i].ms) {
      segment = tempoMap[i];
      break;
    }
  }

  return segment.tick + (ms - segment.ms) * segment.ticksPerMs;
}

/** Inverse of {@link msToTick}, for callers that seek or measure in ticks. */
export function tickToMs(tick: number): number {
  if (tempoMap.length === 0) {
    const bpm = 60_000_000 / microsecondsPerQuarter;
    return (tick * 60_000) / (ppq * bpm);
  }

  let segment = tempoMap[0];
  for (let i = tempoMap.length - 1; i >= 0; i--) {
    if (tick >= tempoMap[i].tick) {
      segment = tempoMap[i];
      break;
    }
  }

  return segment.ms + (tick - segment.tick) / segment.ticksPerMs;
}

export function tickToSeconds(tick: number): number {
  return tickToMs(tick) / 1000;
}

export function secondsToTick(seconds: number): number {
  return msToTick(seconds * 1000);
}

export function getRawSeconds(clockTime: number): number {
  return computeSeconds(clockTime);
}

/** Uncompensated sequencer/source position, matching karaoke-web-online. */
export function getRawValue(clockTime: number): number {
  const seconds = computeSeconds(clockTime);
  return mode === "Tick" ? msToTick(seconds * 1000) : seconds;
}

/**
 * What the listener is hearing right now. Output latency means the sample the
 * ear receives left the scheduler `latency` seconds ago, so lyrics highlight in
 * time with the sound rather than ahead of it.
 */
export function getElapsedSeconds(clockTime: number): number {
  const presentationSeconds = Math.max(0, computeSeconds(clockTime) - latency);
  const floor = presentationFloorSeconds;
  if (floor === null) return presentationSeconds;

  if (presentationSeconds >= floor) {
    presentationFloorSeconds = null;
    return presentationSeconds;
  }
  return floor;
}

/** Position in the active mode's unit — ticks or seconds. */
export function getValue(clockTime: number): number {
  const seconds = getElapsedSeconds(clockTime);
  return mode === "Tick" ? msToTick(seconds * 1000) : seconds;
}

export function getCountdown(clockTime: number): number {
  if (duration === null) return 0;
  return Math.max(0, getTotalSeconds() - getElapsedSeconds(clockTime));
}

export function getTotalSeconds(): number {
  if (duration === null) return 0;
  return durationUnit === "ticks" ? tickToSeconds(duration) : duration;
}

export function isFinished(clockTime: number): boolean {
  if (duration === null || !anchor.playing) return false;
  return getRawSeconds(clockTime) >= getTotalSeconds();
}

export function getBpm(clockTime: number): number {
  if (tempoMap.length === 0) return Math.round(60_000_000 / microsecondsPerQuarter);

  const ms = getElapsedSeconds(clockTime) * 1000;
  let bpm = tempoMap[0].bpm;
  for (let i = tempoMap.length - 1; i >= 0; i--) {
    if (ms >= tempoMap[i].ms) {
      bpm = tempoMap[i].bpm;
      break;
    }
  }
  return bpm;
}

export function getBeatInfo(tick: number): BeatInfo {
  let index = 0;
  for (let i = timeSignatures.length - 1; i >= 0; i--) {
    if (tick >= timeSignatures[i].tick) {
      index = i;
      break;
    }
  }

  const signature = timeSignatures[index];
  const deltaTicks = Math.max(0, tick - signature.tick);
  const ticksPerBeat = ppq * (4 / signature.denominator);
  const ticksPerMeasure = ticksPerBeat * signature.numerator;
  const remainder = deltaTicks % ticksPerMeasure;

  return {
    measure: signature.startMeasure + Math.floor(deltaTicks / ticksPerMeasure),
    beat: Math.floor(remainder / ticksPerBeat) + 1,
    subBeat: (remainder % ticksPerBeat) / ticksPerBeat,
    numerator: signature.numerator,
    denominator: signature.denominator,
    isPreStart: tick < firstNote,
  };
}
