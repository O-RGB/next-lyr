import test from "node:test";
import assert from "node:assert/strict";
import { paintFrameSurface } from "../src/components/lyrics/block-effect-layer";
import { effectGeometry, effectRenderProfile, effectRecipe } from "../src/lib/block-effects/catalog";
import { atlasFrameRects, collectEffectAtlases, type LoadedAtlas } from "../src/lib/block-effects/frames";
import { groupEffectBlocks, type EffectType } from "../src/lib/block-effects/types";
import { buildPlaybackKlyrXml } from "../src/lib/karaoke/lyrics-core/xml";
import { buildYoutubePlayback } from "../src/lib/stickers/playback-assets";
import { layoutInlineWords } from "../src/lib/stickers/inline-layout";
import type { LyricsDocument } from "../src/lib/karaoke/lyrics-core/types";
const atlas = { image: {}, width: 256, height: 256, columns: 4, rows: 4, frames: 16, fps: 12,
  rects: atlasFrameRects(256, 256, 4, 4), anchors: Array.from({ length: 16 }, () => ({ x: 32, y: 55, top: 5 })),
  shapes: Array.from({ length: 16 }, (_, index) => ({ left: 10, top: 5, width: 40, height: 50, emitterX: 20 + index, emitterY: 55 - index })) } as LoadedAtlas;
function render(type: EffectType, wordWidth = 200, time = 0) {
  const origins: number[][] = [], rectangles: number[][] = []; let rotations = 0;
  const context = { setTransform() {}, clearRect() {}, save() {}, restore() {}, scale() {},
    translate(x: number, y: number) { origins.push([x, y]); }, rotate() { rotations++; },
    drawImage(...args: unknown[]) { rectangles.push(args.slice(5, 9) as number[]); } };
  const canvas = { width: 0, height: 0, getContext() { return context; } } as unknown as HTMLCanvasElement;
  const geometry = effectGeometry(wordWidth, 40, type), original = Object.getOwnPropertyDescriptor(globalThis, "devicePixelRatio");
  Object.defineProperty(globalThis, "devicePixelRatio", { configurable: true, value: 1 });
  try { paintFrameSurface(canvas, atlas, { key: "range", effect: { type, connected: true }, left: 0, top: 0, width: geometry.width, height: geometry.height }, time, false); }
  finally { if (original) Object.defineProperty(globalThis, "devicePixelRatio", original); else Reflect.deleteProperty(globalThis, "devicePixelRatio"); }
  return { origins, rectangles, rotations, geometry };
}
test("hearts float in fixed cell space and are placed at both group edges without lightning rotation", () => {
  const first = render("hearts"), next = render("hearts", 200, 1000 / 12 + .01);
  assert.equal(first.rectangles.length, 2); assert.equal(first.rotations, 0);
  assert.deepEqual(next.origins, first.origins); assert.deepEqual(next.rectangles, first.rectangles);
  assert(first.origins[0][0] < first.geometry.outset);
});
test("leaf stems stay attached to the lyric even when each frame's source root changes", () => {
  const first = render("leaves"), next = render("leaves", 200, 1000 / 12 + .01);
  assert.equal(first.rectangles.length, 2); assert.equal(first.rotations, 0);
  assert.deepEqual(first.origins, next.origins);
  assert.notDeepEqual(first.rectangles, next.rectangles);
  for (const [index, rectangle] of next.rectangles.entries()) {
    const frame = index ? 6 : 1, shape = atlas.shapes[frame];
    assert(Math.abs(rectangle[0] + shape.emitterX! / 64 * rectangle[2]) < 1e-6);
    assert(Math.abs(rectangle[1] + shape.emitterY / 64 * rectangle[3]) < 1e-6);
  }
});
test("rain spans its group behind the text, adapting density without flooding long lines", () => {
  const short = render("rain", 20), normal = render("rain", 200), long = render("rain", 2000);
  assert.equal(short.rectangles.length, 1); assert.equal(normal.rectangles.length, 4); assert.equal(long.rectangles.length, 8);
  assert.equal(normal.rotations, 0); assert.equal(effectRenderProfile("rain")?.layer, "behind");
  normal.origins.forEach(([left], index) => {
    assert(left >= normal.geometry.outset);
    assert(left + normal.rectangles[index][2] <= normal.geometry.width - normal.geometry.outset + 1e-6);
  });
});
test("rain keeps normal word spacing instead of reserving space for nonexistent edge ornaments", () => {
  const plain = [{ text: "ฟัง", index: 0, lineIndex: 0, at: 1 }, { text: "ฝน", index: 1, lineIndex: 0, at: 2 }];
  const rainy = plain.map((word, index) => index ? word : { ...word, effect: { type: "rain" as const, connected: true } });
  const placements = (words: typeof plain) => layoutInlineWords(words, 32, 400, () => 40, 0).map(word => [word.contentLeft, word.contentWidth]);
  assert.deepEqual(placements(rainy), placements(plain));
});
test("new effects form separate contiguous groups and use distinct darker sung text palettes", () => {
  const types: EffectType[] = ["hearts", "hearts", "leaves", "leaves", "rain"];
  const words = types.map((type, index) => ({ index, lineIndex: 0, effect: { type, connected: true } }));
  assert.deepEqual(groupEffectBlocks(words).map(run => [run.start, run.end]), [[0, 1], [2, 3], [4, 4]]);
  const brightness = (hex: string) => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
  for (const type of ["hearts", "leaves", "rain"] as const) {
    const theme = effectRecipe(type).text;
    assert(theme.sung.every((color, index) => brightness(color) < brightness(theme.idle[index])));
  }
});
test("export packages each used new atlas once and retains its attachment and playback metadata", async () => {
  const document: LyricsDocument = { source: "MP3", timeBase: { kind: "seconds" }, info: {},
    lines: [["hearts", "hearts", "leaves", "rain", "rain"].map((type, index) => ({ text: "คำ", at: index, index, lineIndex: 0, effect: { type: type as EffectType, connected: true } }))] };
  const bytes = new Uint8Array(24), view = new DataView(bytes.buffer);
  view.setUint32(0, 0x89504e47); view.setUint32(16, 256); view.setUint32(20, 256);
  const reads: string[] = [];
  const assets = await collectEffectAtlases(document, async type => { reads.push(type); return new Blob([bytes]); });
  assert.deepEqual(reads, ["hearts", "leaves", "rain"]); assert.equal(assets.length, 3);
  assert.deepEqual(assets.map(asset => asset.fps), [12, 12, 16]);
  const xml = buildPlaybackKlyrXml(document, [], [...assets, ...assets]);
  assert.equal((xml.match(/<SPRITE /g) ?? []).length, 3); assert(xml.includes("&quot;attachment&quot;:&quot;rain&quot;"));
  const file = buildYoutubePlayback({ youtubeId: "video", info: {}, lyrics: [], chords: [], document, assets: [], effectAtlases: [...assets, ...assets] });
  assert.equal(file.data.effects!.atlases.length, 3);
});
