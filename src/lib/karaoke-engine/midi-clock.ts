import type { ArrayRange } from "@/lib/array-range";
import type { TempoEvent } from "@/lib/karaoke/midi/types";

function tempoEvents(tempos: ArrayRange<TempoEvent> | undefined): TempoEvent[] {
  return (tempos?.ranges ?? [])
    .map((range) => range.value.value)
    .filter((event) => Number.isFinite(event.tick) && event.bpm > 0)
    .sort((left, right) => left.tick - right.tick);
}

/** Converts a MIDI tick position using the same tempo map used by the editor. */
export function midiTickToSeconds(
  tick: number,
  ppq: number,
  tempos?: ArrayRange<TempoEvent>
): number {
  const target = Math.max(0, tick);
  const points = tempoEvents(tempos);
  if (points.length === 0 || points[0].tick > 0) {
    points.unshift({ tick: 0, bpm: 120 });
  }

  let seconds = 0;
  let currentTick = 0;
  let bpm = points[0].bpm;

  for (const point of points) {
    if (point.tick <= currentTick) {
      bpm = point.bpm;
      continue;
    }
    const end = Math.min(target, point.tick);
    if (end > currentTick) {
      seconds += ((end - currentTick) * 60) / (Math.max(1, ppq) * bpm);
      currentTick = end;
    }
    bpm = point.bpm;
    if (currentTick >= target) return seconds;
  }

  if (target > currentTick) {
    seconds += ((target - currentTick) * 60) / (Math.max(1, ppq) * bpm);
  }
  return seconds;
}

export function midiDurationSeconds(
  ticks: number,
  ppq: number,
  tempos?: ArrayRange<TempoEvent>
): number {
  return midiTickToSeconds(ticks, ppq, tempos);
}
