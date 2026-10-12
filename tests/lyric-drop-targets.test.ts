import test from "node:test";
import assert from "node:assert/strict";
import { dropDestination, resolveDragTarget, releaseDropTarget, type MeasuredDropTarget } from "../src/components/modals/edit-lyrics/drop-targets";
import { dropCellContent, cellsFromLine } from "../src/lib/karaoke/inline-content";

const fire = { type: "fire" as const, connected: true };
const rect = (top: number, bottom: number) => ({ left: 0, right: 300, top, bottom });
const bounds = rect(8, 280);
const resolvePointerDrop = (point: { x: number; y: number }, viewport: typeof bounds, gaps: MeasuredDropTarget[], rows: MeasuredDropTarget[]) =>
  resolveDragTarget(point, viewport, [...gaps, ...rows])?.target;
const rows: MeasuredDropTarget[] = [
  { rect: rect(48, 100), target: { kind: "row", index: 0, effect: fire } },
  { rect: rect(100, 152), target: { kind: "row", index: 1, effect: fire } },
  { rect: rect(200, 252), target: { kind: "row", index: 2 } },
];
const gaps: MeasuredDropTarget[] = [
  { rect: rect(0, 8), target: { kind: "gap", beforeIndex: 0 } },
  { rect: rect(8, 44), target: { kind: "gap", beforeIndex: 0, effect: fire } },
  { rect: rect(156, 192), target: { kind: "gap", beforeIndex: 2, effect: fire } },
  { rect: rect(192, 200), target: { kind: "gap", beforeIndex: 2 } },
];
const cells = cellsFromLine(["A", "B", "new"].map((text, index) => ({ text, index, lineIndex: 0, at: index === 2 ? null : index * 480,
  effect: index < 2 ? fire : undefined })));

test("a newly added trailing word joins through the end cap without moving an existing timestamp", () => {
  const target = resolvePointerDrop({ x: 70, y: 174 }, bounds, gaps, rows)!;
  const dropped = dropCellContent(cells, 2, dropDestination(2, cells.length, target), target.effect);
  assert.deepEqual(dropped.map(c => c.text), ["A", "B", "new"]);
  assert(dropped.every(c => c.effect?.type === "fire"));
  assert.deepEqual(dropped.map(c => c.originalIndex), [0, 1, 2]);
});
test("dropping just past a group's end detaches its last word instead of joining a nearby member", () => {
  const target = resolvePointerDrop({ x: 70, y: 196 }, bounds, gaps, rows)!;
  const dropped = dropCellContent(cells, 1, dropDestination(1, cells.length, target), target.effect);
  assert.deepEqual(dropped.map(c => c.effect?.type), ["fire", undefined, undefined]);
  assert.deepEqual(dropped.map(c => c.text), ["A", "B", "new"]);
});
test("the outside gap before the first group is reachable beyond the list's content rectangle", () => {
  const target = resolvePointerDrop({ x: 70, y: 4 }, bounds, gaps, rows)!;
  const dropped = dropCellContent(cells, 0, dropDestination(0, cells.length, target), target.effect);
  assert.equal(dropped[0].effect, undefined);
  assert.equal(dropped[1].effect?.type, "fire");
});
test("a drop directly over a member admits new content into that group's preset", () => {
  const target = resolvePointerDrop({ x: 70, y: 124 }, bounds, gaps, rows)!;
  const dropped = dropCellContent(cells, 2, dropDestination(2, cells.length, target), target.effect);
  assert.deepEqual(dropped.map(c => c.text), ["A", "new", "B"]);
  assert(dropped.every(c => c.effect?.type === "fire"));
});
test("moving beyond the editor still chooses a visible destination in the same vertical position", () => {
  assert.deepEqual(resolvePointerDrop({ x: 800, y: 124 }, bounds, gaps, rows), { ...rows[1].target, effect: undefined });
  assert.deepEqual(resolvePointerDrop({ x: 800, y: 900 }, bounds, gaps, rows), rows[2].target);
});

test("the enlarged touch gap beats an overlapping cap edge while its center still joins the group", () => {
  const touchGaps: MeasuredDropTarget[] = [
    ...gaps.slice(0, 3), { rect: rect(180, 204), target: { kind: "gap", beforeIndex: 2 } },
  ];
  const outside = resolvePointerDrop({ x: 70, y: 192 }, bounds, touchGaps, rows)!;
  const dropped = dropCellContent(cells, 1, dropDestination(1, cells.length, outside), outside.effect);
  assert.equal(dropped[1].effect, undefined);
  assert.equal(resolvePointerDrop({ x: 70, y: 174 }, bounds, touchGaps, rows)?.effect, fire);
});

test("a deep diagonal drag past an entirely grouped line selects its outside end gap", () => {
  const fullGroup = [...rows.slice(0, 2), ...gaps];
  const target = resolveDragTarget({ x: 900, y: 1000 }, bounds, fullGroup)!.target;
  assert.deepEqual(target, { kind: "gap", beforeIndex: 2 });
  assert.equal(dropCellContent(cells, 1, dropDestination(1, cells.length, target), target.effect)[1].effect, undefined);
});
test("off-screen destinations never replace the visible insertion line during scrolling", () => {
  const hidden: MeasuredDropTarget = { rect: rect(500, 552), target: { kind: "row", index: 3, effect: fire } };
  const target = resolveDragTarget({ x: 900, y: 1000 }, rect(48, 220), [...gaps, ...rows, hidden])!;
  assert.equal(target.target.kind, "row");
  assert.equal(target.target.kind === "row" && target.target.index, 2);
});
test("releasing beyond the viewport commits the last displayed line instead of a new guessed target", () => {
  const shown = { activeId: "word", target: { kind: "gap" as const, beforeIndex: 2 } };
  const latest = { kind: "row" as const, index: 1, effect: fire };
  assert.equal(releaseDropTarget("word", shown, latest), shown.target);
  assert.equal(releaseDropTarget("word", shown), shown.target);
  assert.equal(releaseDropTarget("different-word", shown, latest), latest);
});

test("leaving a long group's viewport keeps the visible insertion position and removes its effect", () => {
  const line: MeasuredDropTarget[] = [
    { rect: rect(100, 170), target: { kind: "row", index: 1, effect: fire } },
    { rect: rect(170, 240), target: { kind: "row", index: 2, effect: fire } },
    { rect: rect(240, 310), target: { kind: "row", index: 3, effect: fire } },
  ];
  const target = resolveDragTarget({ x: 70, y: 900 }, rect(80, 220), line, rect(100, 310))!.target;
  assert.deepEqual(target, { kind: "row", index: 2, effect: undefined });
  assert.equal(resolveDragTarget({ x: 70, y: 200 }, rect(80, 220), line, rect(100, 310))!.target.effect, fire);
});
