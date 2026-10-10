export interface StickerImageInfo {
  mime: "image/png" | "image/jpeg" | "image/gif";
  width: number;
  height: number;
  frames: number;
  durationMs: number;
}

/** Inspect dimensions and GIF frame budgets before allocating decoded pixels. */
export function inspectStickerImage(bytes: Uint8Array): StickerImageInfo {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const requireBytes = (end: number) => {
    if (end > bytes.length) throw new Error("invalid-image");
  };
  const validate = (info: StickerImageInfo) => {
    if (!info.width || !info.height || info.width > 8192 || info.height > 8192 ||
      info.width * info.height > 16_000_000) throw new Error("image-too-large");
    if (info.frames > 300 || info.width * info.height * info.frames > 32_000_000) {
      throw new Error("gif-too-complex");
    }
    return info;
  };
  requireBytes(10);
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) {
    requireBytes(33);
    if (String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR") throw new Error("invalid-image");
    let offset = 8;
    while (offset < bytes.length) {
      requireBytes(offset + 12);
      const length = view.getUint32(offset);
      requireBytes(offset + 12 + length);
      if (String.fromCharCode(...bytes.slice(offset + 4, offset + 8)) === "acTL") throw new Error("use-gif-for-animation");
      offset += 12 + length;
    }
    return validate({ mime: "image/png", width: view.getUint32(16), height: view.getUint32(20), frames: 1, durationMs: 0 });
  }
  if (String.fromCharCode(...bytes.slice(0, 6)).match(/^GIF8[79]a$/)) {
    requireBytes(13);
    const width = view.getUint16(6, true), height = view.getUint16(8, true);
    let offset = 13 + (bytes[10] & 128 ? 3 * (1 << ((bytes[10] & 7) + 1)) : 0);
    let frames = 0, durationMs = 0, delay = 0, ended = false;
    const skipBlocks = () => {
      while (true) {
        requireBytes(offset + 1);
        const length = bytes[offset++];
        if (!length) return;
        requireBytes(offset + length);
        offset += length;
      }
    };
    while (offset < bytes.length) {
      const marker = bytes[offset++];
      if (marker === 0x3b) { ended = true; break; }
      if (marker === 0x21) {
        requireBytes(offset + 1);
        const kind = bytes[offset++];
        if (kind === 0xf9) {
          requireBytes(offset + 6);
          if (bytes[offset] !== 4) throw new Error("invalid-image");
          delay = view.getUint16(offset + 2, true) * 10;
        }
        skipBlocks();
      } else if (marker === 0x2c) {
        requireBytes(offset + 9);
        const frameWidth = view.getUint16(offset + 4, true), frameHeight = view.getUint16(offset + 6, true);
        if (!frameWidth || !frameHeight || frameWidth > width || frameHeight > height) throw new Error("invalid-image");
        const packed = bytes[offset + 8];
        offset += 9 + (packed & 128 ? 3 * (1 << ((packed & 7) + 1)) : 0);
        requireBytes(offset + 1);
        offset++; // LZW code size
        skipBlocks();
        frames++;
        durationMs += delay;
        delay = 0;
        validate({ mime: "image/gif", width, height, frames, durationMs });
      } else throw new Error("invalid-image");
    }
    if (!ended || !frames) throw new Error("invalid-image");
    return validate({ mime: "image/gif", width, height, frames, durationMs });
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset < bytes.length) {
      if (bytes[offset++] !== 0xff) throw new Error("invalid-image");
      while (bytes[offset] === 0xff) offset++;
      requireBytes(offset + 3);
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      const length = view.getUint16(offset);
      if (length < 2) throw new Error("invalid-image");
      requireBytes(offset + length);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        if (length < 8) throw new Error("invalid-image");
        return validate({ mime: "image/jpeg", height: view.getUint16(offset + 3), width: view.getUint16(offset + 5), frames: 1, durationMs: 0 });
      }
      offset += length;
    }
    throw new Error("invalid-image");
  }
  throw new Error("unsupported-image");
}

export function fitStickerDimensions(width: number, height: number, maximum = 256) {
  const scale = Math.min(1, maximum / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
