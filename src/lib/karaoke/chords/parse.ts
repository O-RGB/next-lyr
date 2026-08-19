/** MIDI notes used by the chord audition lane. */

const INTERVALS: Record<string, number[]> = {
  "": [0, 4, 7],
  m: [0, 3, 7],
  "7": [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  M7: [0, 4, 7, 11],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  aug: [0, 4, 8],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  "6": [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  m7b5: [0, 3, 6, 10],
  add9: [0, 2, 4, 7],
  add11: [0, 4, 5, 7],
  add13: [0, 4, 7, 9],
};

const PITCH_CLASS: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export interface ParsedChord {
  root: number;
  intervals: number[];
  bass: number | null;
}

function parsePitch(value: string): number | null {
  const match = /^([A-G])([#b]?)$/.exec(value.trim());
  if (!match) return null;
  const base = PITCH_CLASS[match[1]];
  return (base + (match[2] === "#" ? 1 : match[2] === "b" ? 11 : 0)) % 12;
}

export function parseChordName(name: string): ParsedChord | null {
  const match = /^([A-G])([#b]?)(.*)$/.exec(name.trim());
  if (!match) return null;

  const root = parsePitch(`${match[1]}${match[2]}`);
  if (root === null) return null;

  const [qualityPart, slashPart] = match[3].split("/");
  const quality = qualityPart.trim();
  const intervals = INTERVALS[quality];
  if (!intervals) return null;

  return {
    root,
    intervals,
    bass: slashPart ? parsePitch(slashPart) : null,
  };
}

/** Guitar-like close voicing around C3, suitable for checking harmony by ear. */
export function chordToMidiNotes(name: string): number[] | null {
  const chord = parseChordName(name);
  if (!chord) return null;

  const rootMidi = 48;
  const upper = chord.intervals.map(
    (interval) => rootMidi + chord.root + interval
  );
  const bass = rootMidi + (chord.bass ?? chord.root);
  return [...new Set([bass, ...upper])].filter(
    (note) => note >= 0 && note <= 127
  );
}

export const COMMON_CHORD_NAMES = ["C", "Am", "F", "G", "Dm7", "G7"];
