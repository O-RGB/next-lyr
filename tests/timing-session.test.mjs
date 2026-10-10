import test from "node:test";
import assert from "node:assert/strict";
import { reconcileLyricsEdit, timingLyrics, nextTimingWord } from "../src/stores/karaoke-store/timing-session.ts";

function fixture() {
  const lyricsData = [
    [{ text: "ก่อน", at: 0, index: 0, lineIndex: 0 }, { text: "ผิด", at: null, index: 1, lineIndex: 0 }],
    [{ text: "ต่อ", at: null, index: 2, lineIndex: 1 }, { text: "จบ", at: 12, index: 3, lineIndex: 1 }],
  ];
  return { lyricsData, timingSnapshot: structuredClone(lyricsData),
    timingBuffer: { lineIndex: 0, buffer: new Map([[1, { at: 3 }]]) },
    isTimingActive: true, currentIndex: 2, editingLineIndex: 0, editingEndLineIndex: 1,
    selectedLineIndex: 1, timingLineGroups: [[0, 1]], timingOnlyUntimed: true,
    correctionIndex: null, playbackIndex: null };
}

test("recovery includes timestamp zero and buffered stamps without changing the baseline", () => {
  const state = fixture();
  state.timingBuffer.buffer.set(0, { at: 0 });
  assert.deepEqual(timingLyrics(state).flat().map(w => w.at), [0, 3, null, 12]);
  assert.equal(state.lyricsData[0][1].at, null);
});

test("pending correction never erases the original saved timestamp", () => {
  const state = fixture();
  state.timingBuffer.buffer.set(3, { at: null });
  assert.equal(timingLyrics(state)[1][1].at, 12);
});

test("fix a typo halfway through timing and retain the next word and captured stamp", () => {
  const state = fixture();
  const lines = state.lyricsData.map(line => line.map(w => ({ ...w })));
  lines[0][1].text = "ถูก";
  const result = reconcileLyricsEdit(state, lines);
  assert.equal(result.currentIndex, 2);
  assert.equal(result.timingBuffer.buffer.get(1).at, 3);
  assert.equal(result.timingSnapshot[0][1].text, "ถูก");
  assert.equal(result.timingSnapshot[0][1].at, null);
});

test("deleting a previous word remaps the captured timestamps instead of attaching them to another word", () => {
  const state = fixture();
  const result = reconcileLyricsEdit(state, [[state.lyricsData[0][1]], state.lyricsData[1]]);
  assert.equal(result.currentIndex, 1);
  assert.equal(result.timingBuffer.buffer.get(0).at, 3);
  assert.equal(result.lyricsData[0][0].text, "ผิด");
  assert.equal(result.timingSnapshot[1][1].at, 12);
});

test("deleting the next target moves forward, preserving later timestamps", () => {
  const state = fixture();
  const result = reconcileLyricsEdit(state, [state.lyricsData[0], [state.lyricsData[1][1]]]);
  assert.equal(result.currentIndex, 2);
  assert.equal(result.lyricsData.flat()[2].text, "จบ");
  assert.equal(result.lyricsData.flat()[2].at, 12);
});

test("insert a missed word before the next target and replay only that gap", () => {
  const state = fixture();
  const result = reconcileLyricsEdit(state, [[...state.lyricsData[0],
    { text: "เพิ่ม", at: null, index: -1, lineIndex: 0 }], state.lyricsData[1]]);
  assert.equal(result.currentIndex, 2);
  assert.equal(result.lyricsData.flat()[2].text, "เพิ่ม");
  assert.equal(result.timingBuffer.buffer.get(1).at, 3);
  assert.equal(result.timingSnapshot[1][1].at, 12);
});

test("inserting a line moves session bounds, snapshot, and buffered indexes together", () => {
  const state = fixture();
  const result = reconcileLyricsEdit(state, [state.lyricsData[0],
    [{ text: "แทรก", at: null, index: -1, lineIndex: 1 }], state.lyricsData[1]]);
  assert.equal(result.currentIndex, 2);
  assert.equal(result.editingEndLineIndex, 2);
  assert.deepEqual(result.timingLineGroups, [[0, 1, 2]]);
  assert.equal(result.timingSnapshot[2][1].at, 12);
});

test("continuation skips already timed words and stamps already captured in the same session", () => {
  const state = fixture();
  state.currentIndex = 0;
  assert.equal(nextTimingWord(state).index, 2);
  state.currentIndex = 2;
  assert.equal(nextTimingWord(state), undefined);
});

test("retiming stays within its selected lines", () => {
  const state = fixture();
  state.timingOnlyUntimed = false;
  state.currentIndex = 1;
  state.editingEndLineIndex = 0;
  assert.equal(nextTimingWord(state), undefined);
});

test("reordering existing words moves timestamps, baseline, and buffer with those words", () => {
  const state = fixture();
  const result = reconcileLyricsEdit(state, [[state.lyricsData[0][1], state.lyricsData[0][0]], state.lyricsData[1]]);
  assert.equal(result.lyricsData[0][1].at, 0);
  assert.equal(result.timingBuffer.buffer.get(0).at, 3);
  assert.equal(result.timingSnapshot[0][1].at, 0);
});
