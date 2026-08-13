/**
 * NCN cursor units.
 *
 * Cursor positions — both in a standalone `.cur` file and in the KLYR payload
 * embedded in a KMID — are stored against a fixed 24-ticks-per-beat grid, not
 * against the MIDI's own PPQ. They have to be scaled to real ticks before they
 * can be compared with anything the sequencer reports, and scaled back down on
 * the way out.
 *
 * Getting this wrong is silent and dramatic: a 480-PPQ song whose cursor values
 * are used directly runs its lyrics 20x early.
 */

/** The grid NCN cursor values are quantised to. */
export const CURSOR_PPQ = 24;

/** Cursor unit → real MIDI tick. */
export const cursorToTick = (cursor: number, ppq: number): number => {
  if (ppq === 0) return 0;
  return Math.round((cursor * ppq) / CURSOR_PPQ);
};

export const cursorToTicks = (cursor: number[], ppq: number): number[] =>
  cursor.map((value) => cursorToTick(value, ppq));

/** Real MIDI tick → cursor unit. */
export const tickToCursor = (tick: number, ppq: number): number => {
  if (ppq === 0) return 0;
  return Math.round((tick * CURSOR_PPQ) / ppq);
};

export const ticksToCursor = (ticks: number[], ppq: number): number[] =>
  ticks.map((value) => tickToCursor(value, ppq));
