export interface LyricSticker {
  id: string;
  name: string;
  mime: string;
  width: number;
  height: number;
  bytes: number;
  originalBytes: number;
  position: "before" | "after";
}

export type LineStickers = Record<number, LyricSticker>;

export const MAX_STICKER_INPUT_BYTES = 1_000_000;
export const MAX_STATIC_STICKER_BYTES = 200_000;
export const MAX_GIF_STICKER_BYTES = 500_000;
export const MAX_STICKER_DIMENSION = 256;

export interface GalleryImage {
  id: string;
  sticker: LyricSticker;
  sourceHashes: string[];
  createdAt: Date;
}

/** Binary data is embedded once per used image in playback files only. */
export interface PlaybackImage {
  sticker: LyricSticker;
  base64: string;
}
