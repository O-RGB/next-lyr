import type { ChordEvent } from "@/lib/karaoke/midi/types";

/** Return the chord marker physically contained by a timeline block. */
export function findChordForRange(
  chords: readonly ChordEvent[],
  start: number,
  end: number
): ChordEvent | null {
  if (chords.length === 0 || end <= start) return null;

  let low = 0;
  let high = chords.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (chords[middle].tick < start) low = middle + 1;
    else high = middle;
  }

  const marker = chords[low];
  return marker && marker.tick < end ? marker : null;
}
