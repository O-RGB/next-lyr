import { getStickerBlob } from "@/lib/database/db";
import type { LyricSticker } from "@/lib/stickers/types";
import type { stickerPlacement } from "@/lib/stickers/placement";

export interface StickerSlot {
  image: HTMLImageElement | null;
  key: string | null;
  url: string | null;
  generation: number;
}
export const makeStickerSlot = (): StickerSlot => ({ image: null, key: null, url: null, generation: 0 });

export function clearStickerSlot(slot: StickerSlot) {
  slot.generation++;
  if (slot.url) URL.revokeObjectURL(slot.url);
  slot.key = null; slot.url = null;
  if (slot.image) { slot.image.hidden = true; slot.image.removeAttribute("src"); }
}

/** DOM images animate GIFs natively, without redrawing the lyric canvas at 60Hz. */
export function updateStickerSlot(slot: StickerSlot, projectId: string | null, sticker?: LyricSticker,
  placement?: ReturnType<typeof stickerPlacement>) {
  const image = slot.image;
  if (!image) return;
  if (!projectId || !sticker || !placement) {
    if (slot.key) clearStickerSlot(slot);
    return;
  }
  Object.assign(image.style, { left: `${placement.left}px`, top: `${placement.top}px`,
    width: `${placement.width}px`, height: `${placement.height}px` });
  const key = `${projectId}:${sticker.id}`;
  if (slot.key === key) return;
  clearStickerSlot(slot);
  slot.key = key;
  const generation = slot.generation;
  void getStickerBlob(projectId, sticker.id).then((blob) => {
    if (!blob || slot.key !== key || slot.generation !== generation || !slot.image) return;
    slot.url = URL.createObjectURL(blob);
    slot.image.src = slot.url;
    slot.image.alt = sticker.name;
    slot.image.hidden = false;
  }).catch((error) => console.error("Could not display sticker:", error));
}
