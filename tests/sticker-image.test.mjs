import test from "node:test";
import assert from "node:assert/strict";
import { inspectStickerImage, fitStickerDimensions } from "@next-karaoke/lyrics/image-info";
import { stickerPlacement } from "../src/lib/stickers/placement.ts";

const pngHeader = (width, height) => {
  const bytes = new Uint8Array(33);
  bytes.set([137,80,78,71,13,10,26,10]);
  bytes.set([73,72,68,82],12);
  const view = new DataView(bytes.buffer);
  view.setUint32(8,13); view.setUint32(16,width); view.setUint32(20,height);
  return bytes;
};
test("check actual image bytes instead of trusting the filename or MIME", () => {
  assert.throws(() => inspectStickerImage(new TextEncoder().encode('<svg width="10"></svg>')), /unsupported-image/);
});
test("reject truncated PNG chunks before attempting to decode", () => {
  assert.throws(() => inspectStickerImage(pngHeader(20,20).slice(0,25)), /invalid-image/);
});
test("reject tiny compressed files declaring an enormous image", () => {
  assert.throws(() => inspectStickerImage(pngHeader(7000,7000)), /image-too-large/);
});
test("preserve aspect ratio and never upscale a small sticker", () => {
  assert.deepEqual(fitStickerDimensions(1600,1200),{width:256,height:192});
  assert.deepEqual(fitStickerDimensions(24,12),{width:24,height:12});
});
test("a wide sticker fits beside lyrics on mobile without covering the text", () => {
  const sticker = { width:256, height:1, position:"before" };
  const layout = stickerPlacement(sticker,600,24,300,50);
  assert.equal(layout.width,48);
  assert.ok(layout.left >= 0);
  assert.ok(layout.left + layout.width < layout.textCenter);
  assert.ok(layout.availableWidth < 300);
});
test("before and after placement retain the same combined width", () => {
  const before = stickerPlacement({width:100,height:100,position:"before"},100,24,300,50);
  const after = stickerPlacement({width:100,height:100,position:"after"},100,24,300,50);
  assert.ok(before.left < before.textCenter);
  assert.ok(after.left > after.textCenter);
  assert.equal(before.width,after.width);
  assert.equal(before.availableWidth,after.availableWidth);
});
