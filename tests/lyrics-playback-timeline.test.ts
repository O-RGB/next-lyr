import test from "node:test";
import assert from "node:assert/strict";
import { LyricsPlaybackTimeline } from "../src/stores/karaoke-store/utils/lyrics-timeline";
import type { ISentence } from "../src/lib/array-range";

function sentence(start: number, text: string): ISentence {
  return { start, text, valueName: [start], vocal: "" };
}

test("a new line becomes active at its first word while the old character tail overlaps", () => {
  const timeline = new LyricsPlaybackTimeline();
  timeline.addLine([64800, 67480], sentence(64800, "before"), true);
  timeline.addLine([68640, 72320], sentence(68640, "flames"), true);
  timeline.addLine([71760, 75360], sentence(71760, "we ride"), true);
  assert.equal(timeline.search(71759)?.index, 1);
  for (let tick = 71760; tick <= 75360; tick += 20) {
    assert.equal(timeline.search(tick)?.index, 2, `wrong active line at ${tick}`);
  }
  // Backward seeking and the exact start boundary use the same ownership.
  assert.equal(timeline.search(68640)?.index, 1);
  assert.equal(timeline.search(64800)?.index, 0);
  assert.equal(timeline.search(64799), undefined);
});

test("untimed decorations keep their row without becoming a playback cue", () => {
  const timeline = new LyricsPlaybackTimeline();
  timeline.addLine([100, 500], sentence(100, "first"), true);
  timeline.addLine([500, 500], sentence(500, "decoration"), false);
  timeline.addLine([400, 700], sentence(400, "second"), true);
  assert.equal(timeline.search(399)?.index, 0);
  assert.equal(timeline.search(400)?.index, 2);
  assert.equal(timeline.search(900)?.index, 2);
});
