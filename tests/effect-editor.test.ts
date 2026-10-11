import test from "node:test";
import assert from "node:assert/strict";
import { layoutEffectEditorBlocks } from "@next-karaoke/lyrics/effects";
import { applySelectedEffect, resolveEffectSelection, resizeEffectRun, selectionAfterDraftHistory } from "@next-karaoke/lyrics/effects";
import { groupEffectBlocks, type BlockEffect } from "@next-karaoke/lyrics/effects";
import { cellsFromLine } from "../src/lib/karaoke/inline-content";
const fire: BlockEffect = { type: "fire", connected: true };
const words = (effects: Array<BlockEffect | undefined>) => effects.map((effect, index) => ({ text: `word${index}`, index, lineIndex: 0, at: index + 1, effect }));
test("normal lines have only word blocks and retain their original spacing and baseline", () => {
  const layout = layoutEffectEditorBlocks(words([undefined, undefined, undefined]), [30, 40, 50], { gap: 7 });
  assert.deepEqual(layout.nodes.map(node => node.kind), ["word", "word", "word"]);
  assert.deepEqual(layout.words.map(word => [word.left, word.lift]), [[0, 0], [37, 0], [84, 0]]);
  assert.equal(layout.width, 134); assert.equal(layout.groups.length, 0);
});
test("a complete effect range adds exactly two visual caps and raises its words", () => {
  const line = words([fire, fire, fire, fire]);
  const layout = layoutEffectEditorBlocks(line, [30, 40, 50, 60], { gap: 7, lift: 5 });
  assert.deepEqual(layout.nodes.map(node => node.kind), ["effect", "word", "word", "word", "word", "effect"]);
  assert(layout.words.every(word => word.lift === 5)); assert.equal(layout.groups.length, 1);
  assert.deepEqual(line.map(word => [word.index, word.at]), [[0, 1], [1, 2], [2, 3], [3, 4]]);
});
test("partial and disconnected ranges leave ungrouped words at their normal height", () => {
  const layout = layoutEffectEditorBlocks(words([fire, fire, undefined, fire, undefined]), [30, 40, 50, 30, 40], { gap: 4, lift: 4 });
  assert.deepEqual(layout.words.map(word => word.lift), [4, 4, 0, 4, 0]);
  assert.deepEqual(layout.groups.map(group => [group.run.start, group.run.end]), [[0, 1], [3, 3]]);
  assert(layout.groups[0].endCap.left < layout.words[2].left);
  assert(layout.groups[1].endCap.left < layout.words[4].left);
});
test("reopening a saved line restores an existing effect instead of an empty selection", () => {
  const cells = cellsFromLine(words([fire, fire, undefined, { type: "lightning", connected: false }]));
  assert.deepEqual([...resolveEffectSelection(cells)], ["slot-0", "slot-1"]);
  assert.deepEqual([...resolveEffectSelection(cells, { focusIndex: 3 })], ["slot-3"]);
  assert.equal(cells[3].effect?.connected, false);
});
test("an explicit boundary click selects its own saved group over a remembered other group", () => {
  const cells = cellsFromLine(words([fire, fire, undefined, { type: "lightning", connected: true }]));
  assert.deepEqual([...resolveEffectSelection(cells, { requestedIndices: [3], rememberedKeys: new Set(["slot-0", "slot-1"]) })], ["slot-3"]);
  assert.deepEqual([...resolveEffectSelection(cells, { rememberedKeys: new Set(["slot-3", "deleted"]) })], ["slot-3"]);
});
test("changing group range edits only effects, retaining content and timestamp slot references", () => {
  const cells = cellsFromLine(words([fire, fire, undefined, undefined, undefined]));
  const next = resizeEffectRun(cells, groupEffectBlocks(cells)[0], 1, 3);
  assert.deepEqual(next.map(cell => cell.effect?.type), [undefined, "fire", "fire", "fire", undefined]);
  assert.deepEqual(next.map(cell => [cell.key, cell.text, cell.originalIndex]), cells.map(cell => [cell.key, cell.text, cell.originalIndex]));
  assert.deepEqual(cells.map(cell => cell.effect?.type), ["fire", "fire", undefined, undefined, undefined]);
});

test("returning to an unsaved expanded group restores the current draft range", () => {
  const draft = cellsFromLine(words([fire, fire, fire, fire]));
  assert.deepEqual([...resolveEffectSelection(draft, { requestedIndices: [0, 1] })], ["slot-0", "slot-1", "slot-2", "slot-3"]);
});

test("undoing and redoing a range edit keeps the group's controls on its current members", () => {
  const short = cellsFromLine(words([fire, fire, undefined, undefined]));
  const long = resizeEffectRun(short, groupEffectBlocks(short)[0], 0, 3);
  const afterUndo = selectionAfterDraftHistory(long, short, new Set(long.map(cell => cell.key)));
  assert.deepEqual([...afterUndo], ["slot-0", "slot-1"]);
  assert.deepEqual([...selectionAfterDraftHistory(short, long, afterUndo)], ["slot-0", "slot-1", "slot-2", "slot-3"]);
});

test("choosing a weather card uses the prior selection, joining neighbors without filling its gaps", () => {
  const cells = cellsFromLine(words([{ ...fire, connected: false }, { ...fire, connected: false }, undefined, undefined]));
  const selected = new Set([cells[0].key, cells[1].key, cells[3].key]);
  const next = applySelectedEffect(cells, selected, { type: "rain", variant: "storm", connected: true });
  assert.deepEqual(groupEffectBlocks(next).map(run => [run.start, run.end, run.effect.variant]), [[0, 1, "storm"], [3, 3, "storm"]]);
  assert.equal(next[2], cells[2]);
  assert.deepEqual(next.map(cell => [cell.key, cell.originalIndex, cell.text]), cells.map(cell => [cell.key, cell.originalIndex, cell.text]));
  assert.equal(cells[0].effect?.connected, false);
});

test("choosing no effect clears only the selected blocks and keeps their content and timing slot references", () => {
  const cells = cellsFromLine(words([fire, fire, fire]));
  const next = applySelectedEffect(cells, new Set([cells[1].key]));
  assert.deepEqual(next.map(cell => cell.effect?.type), ["fire", undefined, "fire"]);
  assert.deepEqual(next.map(cell => [cell.key, cell.originalIndex, cell.text]), cells.map(cell => [cell.key, cell.originalIndex, cell.text]));
});
