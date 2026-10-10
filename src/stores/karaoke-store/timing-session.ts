import type { LyricWordData } from "@/types/common.type";
import type { KaraokeState } from "./types";

/** Include in-progress stamps when saving, previewing, or recording history. */
export function timingLyrics(state: Pick<KaraokeState, "lyricsData" | "timingBuffer">) {
  const buffer = state.timingBuffer?.buffer;
  if (!buffer?.size) return state.lyricsData;
  return state.lyricsData.map((line) => line.map((word) => {
    const at = buffer.get(word.index)?.at;
    return at !== null && at !== undefined ? { ...word, at } : word;
  }));
}

export function nextTimingWord(state: Pick<KaraokeState,
  "lyricsData" | "timingBuffer" | "currentIndex" | "editingLineIndex" | "editingEndLineIndex" | "timingOnlyUntimed"
>) {
  return state.lyricsData.flat().find((word) =>
    word.index > state.currentIndex &&
    (state.editingLineIndex === null || word.lineIndex >= state.editingLineIndex) &&
    (state.editingEndLineIndex === null || word.lineIndex <= state.editingEndLineIndex) &&
    state.timingBuffer?.buffer.get(word.index)?.at == null &&
    (!state.timingOnlyUntimed || word.at === null)
  );
}

/** Words carry their OLD index until this transaction assigns the new ones.
 * New words use -1. Remap every timing reference together, never just the grid.
 */
export function reconcileLyricsEdit(state: KaraokeState, draftLines: LyricWordData[][], structuralLineMap?: ReadonlyMap<number, number>): Partial<KaraokeState> {
  const oldWords = new Map(state.lyricsData.flat().map((word) => [word.index, word]));
  const indexMap = new Map<number, number>();
  const lineMap = new Map<number, number>(structuralLineMap ??
    (draftLines.length === state.lyricsData.length ? state.lyricsData.map((_, index) => [index, index] as const) : []));
  const inserted = new Set<number>();
  let index = 0;
  const lyricsData = draftLines.map((line, lineIndex) => line.map((word) => {
    const nextIndex = index++;
    if (word.index >= 0) {
      indexMap.set(word.index, nextIndex);
      const old = oldWords.get(word.index);
      if (old) lineMap.set(old.lineIndex, lineIndex);
    } else inserted.add(nextIndex);
    return { ...word, index: nextIndex, lineIndex };
  }));
  const flat = lyricsData.flat();
  const mapIndex = (oldIndex: number | null) => oldIndex === null ? null : indexMap.get(oldIndex) ?? null;
  const mapLine = (oldLine: number | null) => oldLine === null || lyricsData.length === 0 ? null : lineMap.get(oldLine) ?? Math.min(oldLine, lyricsData.length - 1);
  const lineStickers = Object.fromEntries(Object.entries(state.lineStickers ?? {}).flatMap(([line, sticker]) => {
    const nextLine = lineMap.get(Number(line));
    return nextLine === undefined ? [] : [[nextLine, sticker]];
  }));
  const timingMode = state.isTimingActive || state.editingLineIndex !== null;
  if (!timingMode) return {
    lyricsData,
    lineStickers,
    currentIndex: mapIndex(state.currentIndex) ?? -1,
    playbackIndex: mapIndex(state.playbackIndex),
    playbackVisualOverride: null,
    selectedLineIndex: mapLine(state.selectedLineIndex),
  };

  const buffer = new Map<number, { at: number | null }>();
  state.timingBuffer?.buffer.forEach((value, oldIndex) => {
    const nextIndex = indexMap.get(oldIndex);
    if (nextIndex !== undefined) buffer.set(nextIndex, { ...value });
  });
  let currentIndex = state.currentIndex === -1 ? -1 : indexMap.get(state.currentIndex);
  if (currentIndex === undefined) {
    const following = [...indexMap.entries()].find(([oldIndex]) => oldIndex > state.currentIndex);
    currentIndex = following?.[1] ?? flat.length;
  }
  // A missing word inserted before the next target needs its own timestamp.
  // Replay that small gap, retaining every timestamp already captured.
  const firstInserted = flat.find((word) => inserted.has(word.index) &&
    word.lineIndex >= (mapLine(state.editingLineIndex) ?? 0) && word.index <= currentIndex!);
  if (firstInserted) currentIndex = firstInserted.index;

  const snapshotWords = new Map(state.timingSnapshot?.flat().map((word) => [word.index, word]));
  const timingSnapshot = state.timingSnapshot ? draftLines.map((line, lineIndex) =>
    line.map((word, wordIndex) => ({ ...word, at: snapshotWords.get(word.index)?.at ?? null,
      index: lyricsData[lineIndex][wordIndex].index,
      lineIndex }))
  ) : null;
  const timingLineGroups = state.timingLineGroups?.map((group) => {
    const first = mapLine(group[0])!;
    const last = group.at(-1) === state.lyricsData.length - 1
      ? lyricsData.length - 1 : mapLine(group.at(-1)!)!;
    return Array.from({ length: Math.max(0, last - first + 1) }, (_, offset) => first + offset);
  }) ?? null;
  return {
    lyricsData, lineStickers, currentIndex, timingSnapshot, timingLineGroups,
    editingLineIndex: mapLine(state.editingLineIndex),
    editingEndLineIndex: state.editingEndLineIndex === state.lyricsData.length - 1
      ? lyricsData.length - 1 : mapLine(state.editingEndLineIndex),
    selectedLineIndex: mapLine(state.selectedLineIndex),
    correctionIndex: mapIndex(state.correctionIndex),
    playbackIndex: null, playbackVisualOverride: null,
    timingBuffer: state.timingBuffer ? { lineIndex: mapLine(state.timingBuffer.lineIndex)!, buffer } : null,
  };
}
