import { groupEffectBlocks, type EffectRun } from "./types";
import type { LyricCellDraft } from "../karaoke/inline-content";

/** Restore the requested group, a remembered selection, or a saved effect near the cursor. */
export function resolveEffectSelection(cells: LyricCellDraft[], options: {
  requestedIndices?: readonly number[] | null;
  rememberedKeys?: ReadonlySet<string>;
  focusIndex?: number;
} = {}): Set<string> {
  if (options.requestedIndices?.length) {
    const indices = new Set(options.requestedIndices);
    const requested = cells.filter(cell => cell.originalIndex !== null && indices.has(cell.originalIndex));
    if (requested.length) {
      const positions = requested.map(cell => cells.indexOf(cell));
      const run = groupEffectBlocks(cells).find(run => positions.every(index => index >= run.start && index <= run.end));
      return new Set(run ? cells.slice(run.start, run.end + 1).map(cell => cell.key) : requested.map(cell => cell.key));
    }
  }
  const remembered = cells.filter(cell => options.rememberedKeys?.has(cell.key));
  if (remembered.length) return new Set(remembered.map(cell => cell.key));
  const runs = groupEffectBlocks(cells);
  const focused = cells.findIndex(cell => cell.originalIndex === options.focusIndex);
  const run = runs.find(run => focused >= run.start && focused <= run.end) ?? runs[0];
  return new Set(run ? cells.slice(run.start, run.end + 1).map(cell => cell.key) : []);
}

/** Only effect membership changes. Content and the original timing slots stay intact. */
export function resizeEffectRun(cells: LyricCellDraft[], run: EffectRun, from: number, to: number): LyricCellDraft[] {
  if (!cells.length) return cells;
  const start = Math.max(0, Math.min(cells.length - 1, from));
  const end = Math.max(start, Math.min(cells.length - 1, to));
  const effect = { ...run.effect, connected: end > start || run.effect.connected };
  return cells.map((cell, index) => index >= start && index <= end ? { ...cell, effect }
    : index >= run.start && index <= run.end ? { ...cell, effect: undefined } : cell);
}

/** Undo/redo keeps a selected effect entity focused when its range changes. */
export function selectionAfterDraftHistory(previous: LyricCellDraft[], next: LyricCellDraft[], selected: ReadonlySet<string>): Set<string> {
  const targets = previous.filter(cell => selected.has(cell.key));
  const active = groupEffectBlocks(previous).find(run => targets.length === run.end - run.start + 1 && previous.slice(run.start, run.end + 1).every(cell => selected.has(cell.key)));
  if (active || (targets.length > 0 && targets.every(cell => !cell.effect))) {
    const key = active ? previous[active.start].key : targets[0].key;
    const position = next.findIndex(cell => cell.key === key);
    const run = groupEffectBlocks(next).find(run => position >= run.start && position <= run.end);
    if (run) return new Set(next.slice(run.start, run.end + 1).map(cell => cell.key));
  }
  return new Set(next.filter(cell => selected.has(cell.key)).map(cell => cell.key));
}
