import { groupEffectBlocks, type EffectBlock, type EffectRun } from "./types";

export interface EditorWordPlacement {
  kind: "word"; position: number; left: number; width: number; lift: number;
}
export interface EditorEffectCap {
  kind: "effect"; side: "start" | "end"; group: number; left: number; width: number; lift: number;
}
export interface EditorEffectGroup {
  run: EffectRun; startCap: EditorEffectCap; endCap: EditorEffectCap;
}

/** Effect caps occupy editor space but never enter the lyric/timestamp array. */
export function layoutEffectEditorBlocks(blocks: readonly EffectBlock[], widths: readonly number[], options: {
  gap: number; capWidth?: number; lift?: number;
}) {
  const runs = groupEffectBlocks(blocks), capWidth = options.capWidth ?? 52, lift = options.lift ?? 5;
  const starts = new Map(runs.map((run, index) => [run.start, index]));
  const ends = new Map(runs.map((run, index) => [run.end, index]));
  const members = new Set(runs.flatMap(run => Array.from({ length: run.end - run.start + 1 }, (_, index) => run.start + index)));
  const nodes: Array<EditorWordPlacement | EditorEffectCap> = [], words: EditorWordPlacement[] = [];
  const groups: EditorEffectGroup[] = [];
  let left = 0;
  const append = <T extends EditorWordPlacement | EditorEffectCap>(node: T): T => {
    if (nodes.length) left += options.gap;
    node.left = left; nodes.push(node); left += node.width; return node;
  };
  blocks.forEach((_, position) => {
    const start = starts.get(position);
    if (start !== undefined) {
      const startCap = append({ kind: "effect", side: "start", group: start, left: 0, width: capWidth, lift } as EditorEffectCap);
      groups[start] = { run: runs[start], startCap, endCap: startCap };
    }
    words.push(append({ kind: "word", position, left: 0, width: widths[position] ?? 0, lift: members.has(position) ? lift : 0 }));
    const end = ends.get(position);
    if (end !== undefined) groups[end].endCap = append({ kind: "effect", side: "end", group: end, left: 0, width: capWidth, lift } as EditorEffectCap);
  });
  return { nodes, words, groups, width: left };
}
