import { getGalleryImages, putStickerAsset } from "@/lib/database/db";
import { optimizeSticker } from "./optimize";
import { MAX_STICKER_INPUT_BYTES } from "@next-karaoke/lyrics/media";

/** One import path for uploads; reuse the original file hash before optimizing. */
export async function importGalleryImage(projectId: string, file: File, signal: AbortSignal) {
  const check = () => { if (signal.aborted) throw new DOMException("Upload cancelled", "AbortError"); };
  check();
  if (file.size > MAX_STICKER_INPUT_BYTES) throw new Error("file-too-large");
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const sourceHash = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
  const existing = (await getGalleryImages()).find(image => image.sourceHashes.includes(sourceHash));
  check();
  if (existing) return { sticker: existing.sticker, reused: true };
  const result = await optimizeSticker(file, signal);
  check();
  const stored = await putStickerAsset(projectId, result.sticker, result.blob, sourceHash);
  check();
  return { sticker: stored.sticker, reused: false };
}
