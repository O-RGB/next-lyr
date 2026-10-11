import type { LyricSticker } from "@next-karaoke/lyrics/media";

export function stickerPlacement(sticker: LyricSticker, textWidth: number, fontSize: number, viewportWidth: number, y: number) {
  const scale = Math.min(fontSize / sticker.height, fontSize * 2 / sticker.width);
  const width = sticker.width * scale, height = sticker.height * scale;
  const gap = fontSize * 0.2;
  const availableWidth = Math.max(1, viewportWidth - width - gap);
  const displayedTextWidth = Math.min(textWidth, availableWidth * 0.94);
  const left = (viewportWidth - displayedTextWidth - width - gap) / 2;
  return {
    textCenter: left + (sticker.position === "before" ? width + gap : 0) + displayedTextWidth / 2,
    availableWidth,
    left: sticker.position === "before" ? left : left + displayedTextWidth + gap,
    top: y - height / 2, width, height,
  };
}
