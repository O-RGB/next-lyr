export interface CanvasSize {
  width: number;
  height: number;
  dpr: number;
}

/** Resize a canvas without making its CSS size depend on device pixel ratio. */
export function resizeCanvas(
  canvas: HTMLCanvasElement,
  requestedDpr = typeof window === "undefined" ? 1 : window.devicePixelRatio
): CanvasSize {
  const width = Math.max(1, canvas.clientWidth || canvas.parentElement?.clientWidth || 1);
  const height = Math.max(1, canvas.clientHeight || canvas.parentElement?.clientHeight || 1);
  const dpr = Math.max(1, Math.min(2, requestedDpr || 1));
  const pixelWidth = Math.max(1, Math.round(width * dpr));
  const pixelHeight = Math.max(1, Math.round(height * dpr));

  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

  return { width, height, dpr };
}

export function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 4
): void {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
