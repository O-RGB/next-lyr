import type { LoadedAtlas } from "./frames";

/** Shared by the main lyric group buttons and the vertical line editor. */
export function paintEffectIcon(canvas: HTMLCanvasElement, atlas: LoadedAtlas, index: number, size = 16) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
    canvas.width = size * dpr;
    canvas.height = size * dpr;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const rect = atlas.rects[index], shape = atlas.shapes[index];
  const scale = Math.min((size - 2) / shape.width, (size - 2) / shape.height);
  const width = shape.width * scale, height = shape.height * scale;
  ctx.drawImage(atlas.image, rect.x + shape.left, rect.y + shape.top, shape.width, shape.height,
    (size - width) / 2, (size - height) / 2, width, height);
}
