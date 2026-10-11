import test from "node:test";
import assert from "node:assert/strict";
import { GifCompositor, gifFrameAtTime, type GifPatch } from "@next-karaoke/lyrics/gif";
const red = [255, 0, 0, 255], blue = [0, 0, 255, 255], transparent = [0, 0, 0, 0];
const patch = (left: number, pixels: number[], disposalType = 1): GifPatch => ({
  dims: { left, top: 0, width: pixels.length / 4, height: 1 }, patch: new Uint8ClampedArray(pixels), disposalType,
});
test("GIF patches keep earlier pixels and transparent patches leave them intact", () => {
  const gif = new GifCompositor(2, 1);
  gif.draw(patch(0, [...red, ...red]));
  assert.deepEqual([...gif.draw(patch(0, [...transparent, ...blue]))], [...red, ...blue]);
});
test("restore-background disposal clears only the preceding patch rectangle", () => {
  const gif = new GifCompositor(3, 1);
  gif.draw(patch(0, [...red, ...red, ...red])); gif.draw(patch(1, blue, 2));
  assert.deepEqual([...gif.draw(patch(2, blue))], [...red, ...transparent, ...blue]);
});
test("restore-previous disposal restores the screen from before that frame", () => {
  const gif = new GifCompositor(2, 1);
  gif.draw(patch(0, [...red, ...red])); gif.draw(patch(0, blue, 3));
  assert.deepEqual([...gif.draw(patch(1, blue))], [...red, ...blue]);
});
test("opaque GIF background survives disposal while transparent GIFs stay transparent", () => {
  const gif = new GifCompositor(2, 1, blue);
  gif.draw(patch(0, red, 2));
  assert.deepEqual([...gif.draw(patch(1, red))], [...blue, ...red]);
});
test("wrapping a GIF resets the composite instead of carrying the last frame into the new loop", () => {
  const gif = new GifCompositor(2, 1);
  gif.draw(patch(0, [...red, ...red])); gif.reset();
  assert.deepEqual([...gif.draw(patch(1, blue))], [...transparent, ...blue]);
});
test("variable GIF delays, loop boundaries, finite loops and reduced motion choose the right frame", () => {
  const delays = [120, 180, 240];
  assert.deepEqual([0, 119, 120, 299, 300, 539, 540, 660].map(time => gifFrameAtTime(delays, time)), [0, 0, 1, 1, 2, 2, 0, 1]);
  assert.equal(gifFrameAtTime(delays, 900, true), 0);
  assert.equal(gifFrameAtTime(delays, 660, false, 1), 2);
  assert.equal(gifFrameAtTime(delays, 660, false, 2), 1);
});
