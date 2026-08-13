/**
 * Undo history.
 *
 * Snapshot-based: every mutation in this store already replaces the lyric and
 * chord arrays immutably, so a "snapshot" is just a handful of references and
 * the untouched parts stay shared between entries. That is cheap, and unlike a
 * pair of hand-written do/undo commands it cannot drift out of sync with what
 * the action actually did.
 *
 * Pure and generic, so the sequencing rules — coalescing, branch truncation,
 * trimming — can be reasoned about and tested without a store.
 */

export interface HistoryEntry<T> {
  id: string;
  /** Human-readable description of the action that produced this state. */
  label: string;
  at: number;
  state: T;
  /** Set while a gesture is still merging into this entry. */
  coalesceKey?: string;
}

export interface History<T> {
  entries: HistoryEntry<T>[];
  /** Index of the state currently in effect. */
  index: number;
}

export interface PushOptions {
  label: string;
  /**
   * Actions sharing a key merge into the previous entry while they keep
   * arriving — typing a song title is one undo step, not twenty.
   */
  coalesce?: string;
  now?: number;
}

/** How long a coalescing key stays open after the last change. */
export const COALESCE_MS = 700;

/** Depth of the log; older entries fall off the front. */
export const HISTORY_LIMIT = 80;

let counter = 0;

function nextId(): string {
  counter += 1;
  return `h${counter}`;
}

export function initHistory<T>(
  state: T,
  label: string,
  now = Date.now()
): History<T> {
  return { entries: [{ id: nextId(), label, at: now, state }], index: 0 };
}

export function pushHistory<T>(
  history: History<T>,
  state: T,
  options: PushOptions
): History<T> {
  const now = options.now ?? Date.now();
  const current = history.entries[history.index];
  const atTip = history.index === history.entries.length - 1;

  // Continue an in-progress gesture rather than stacking near-identical steps.
  if (
    atTip &&
    options.coalesce &&
    current &&
    current.coalesceKey === options.coalesce &&
    now - current.at < COALESCE_MS
  ) {
    const entries = history.entries.slice();
    entries[history.index] = { ...current, state, at: now };
    return { entries, index: history.index };
  }

  // A new action after an undo discards whatever was ahead of it.
  const kept = history.entries.slice(0, history.index + 1);
  kept.push({
    id: nextId(),
    label: options.label,
    at: now,
    state,
    coalesceKey: options.coalesce,
  });

  const overflow = Math.max(0, kept.length - HISTORY_LIMIT);
  const entries = overflow > 0 ? kept.slice(overflow) : kept;
  return { entries, index: entries.length - 1 };
}

export function canUndo<T>(history: History<T>): boolean {
  return history.index > 0;
}

export function canRedo<T>(history: History<T>): boolean {
  return history.index < history.entries.length - 1;
}

export function undo<T>(history: History<T>): History<T> {
  if (!canUndo(history)) return history;
  return { ...history, index: history.index - 1 };
}

export function redo<T>(history: History<T>): History<T> {
  if (!canRedo(history)) return history;
  return { ...history, index: history.index + 1 };
}

/** Jumps straight to a logged entry; an unknown id leaves the history alone. */
export function jumpTo<T>(history: History<T>, id: string): History<T> {
  const index = history.entries.findIndex((entry) => entry.id === id);
  return index < 0 ? history : { ...history, index };
}

export function currentEntry<T>(history: History<T>): HistoryEntry<T> {
  return history.entries[history.index];
}

export function currentState<T>(history: History<T>): T {
  return currentEntry(history).state;
}
