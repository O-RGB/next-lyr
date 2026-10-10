export interface GifPatch {
  dims: { left: number; top: number; width: number; height: number };
  patch: Uint8ClampedArray;
  disposalType: number;
}

/** Keep two logical screens, never an uncompressed copy of every GIF frame. */
export class GifCompositor {
  readonly pixels: Uint8ClampedArray;
  private previous?: GifPatch;
  private restored?: Uint8ClampedArray;
  constructor(readonly width: number, readonly height: number, private background: readonly number[] = [0, 0, 0, 0]) {
    this.pixels = new Uint8ClampedArray(width * height * 4);
    this.reset();
  }
  private clear(start: number, end: number) {
    if (!this.background[3]) this.pixels.fill(0, start, end);
    else for (let offset = start; offset < end; offset += 4) this.pixels.set(this.background, offset);
  }
  reset() { this.clear(0, this.pixels.length); this.previous = undefined; this.restored = undefined; }
  draw(frame: GifPatch) {
    if (this.previous?.disposalType === 2) {
      const { left, top, width, height } = this.previous.dims;
      for (let y = Math.max(0, top); y < Math.min(this.height, top + height); y++) {
        this.clear((y * this.width + Math.max(0, left)) * 4,
          (y * this.width + Math.min(this.width, left + width)) * 4);
      }
    } else if (this.previous?.disposalType === 3 && this.restored) this.pixels.set(this.restored);
    this.restored = frame.disposalType === 3 ? this.pixels.slice() : undefined;
    const { left, top, width, height } = frame.dims;
    for (let y = 0; y < height && top + y < this.height; y++) {
      if (top + y < 0) continue;
      for (let x = 0; x < width && left + x < this.width; x++) {
        if (left + x < 0) continue;
        const source = (y * width + x) * 4;
        if (!frame.patch[source + 3]) continue;
        const target = ((top + y) * this.width + left + x) * 4;
        this.pixels[target] = frame.patch[source]; this.pixels[target + 1] = frame.patch[source + 1];
        this.pixels[target + 2] = frame.patch[source + 2]; this.pixels[target + 3] = frame.patch[source + 3];
      }
    }
    // Retain only disposal metadata, not the decompressed patch.
    this.previous = { dims: frame.dims, disposalType: frame.disposalType, patch: new Uint8ClampedArray(0) };
    return this.pixels;
  }
}

export function gifFrameAtTime(delays: readonly number[], milliseconds: number, reduced = false, loops = Infinity): number {
  if (reduced || delays.length < 2) return 0;
  const duration = delays.reduce((sum, delay) => sum + delay, 0);
  if (milliseconds >= duration * loops) return delays.length - 1;
  let remaining = Math.max(0, milliseconds) % Math.max(1, duration);
  for (let index = 0; index < delays.length; index++) {
    if (remaining < delays[index]) return index;
    remaining -= delays[index];
  }
  return delays.length - 1;
}
