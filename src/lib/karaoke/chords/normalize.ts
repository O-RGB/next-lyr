import type {
  ChordEvent,
  IMidiParseResult,
  TimeSignatureEvent,
} from "@/lib/karaoke/midi/types";

const CHORD_SNAP_TOLERANCE_TICKS = 10;

/**
 * Align small MIDI marker inaccuracies to the beat grid used by the editor.
 *
 * The editor divides a beat into four at its first subdivision level, so that
 * is the most precise position we normalize during import. Intentional
 * off-grid markers are left untouched when they are farther than the small
 * tolerance; the editor can still represent them at a deeper level.
 */
export function normalizeChordEvents(
  chords: readonly ChordEvent[],
  midi: Pick<IMidiParseResult, "ticksPerBeat" | "timeSignatures"> | null
): ChordEvent[] {
  if (!midi || chords.length === 0) {
    return chords.map((chord) => ({ ...chord }));
  }

  const signatures = normalizeSignatures(midi.timeSignatures);
  const ppq = Math.max(1, midi.ticksPerBeat);
  const byTick = new Map<number, ChordEvent>();

  for (const chord of chords) {
    const tick = Math.max(0, chord.tick);
    const signature = getSignatureAtTick(signatures, tick);
    const beatLength =
      ppq * (4 / Math.max(1, signature.denominator));
    const subdivision = Math.max(1, beatLength / 4);
    const relative = tick - signature.tick;
    const snapped =
      signature.tick + Math.round(relative / subdivision) * subdivision;
    const normalizedTick =
      Math.abs(snapped - tick) <= CHORD_SNAP_TOLERANCE_TICKS
        ? Math.max(0, Math.round(snapped))
        : Math.round(tick);

    // Two markers that differ only by a few ticks describe the same editor
    // position. Keep the later source marker so the final imported chord wins.
    byTick.set(normalizedTick, {
      ...chord,
      tick: normalizedTick,
    });
  }

  return [...byTick.values()].sort((left, right) => left.tick - right.tick);
}

function normalizeSignatures(
  signatures: readonly TimeSignatureEvent[]
): TimeSignatureEvent[] {
  const sorted = [...signatures]
    .filter((signature) => Number.isFinite(signature.tick))
    .sort((left, right) => left.tick - right.tick);
  if (sorted.length === 0 || sorted[0].tick > 0) {
    sorted.unshift({ tick: 0, numerator: 4, denominator: 4 });
  }
  return sorted;
}

function getSignatureAtTick(
  signatures: readonly TimeSignatureEvent[],
  tick: number
): TimeSignatureEvent {
  let selected = signatures[0];
  for (let index = 1; index < signatures.length; index += 1) {
    if (signatures[index].tick > tick) break;
    selected = signatures[index];
  }
  return selected;
}

