import { getStickerBlob } from "@/lib/database/db";
import type { LyricSticker } from "@/lib/stickers/types";

export interface InlineImagePlacement {
  key: string; sticker: LyricSticker; left: number; top: number; width: number; height: number;
  clipLeft?: number; clipRight?: number;
}
interface ImageEntry { image: HTMLImageElement; source: string; url: string | null; cancelled: boolean }
export interface InlineImageLayer { element: HTMLDivElement | null; entries: Map<string, ImageEntry> }
export const makeInlineImageLayer = (): InlineImageLayer => ({ element: null, entries: new Map() });

function removeEntry(entry: ImageEntry) {
  entry.cancelled = true;
  if (entry.url) URL.revokeObjectURL(entry.url);
  entry.image.removeAttribute("src"); entry.image.remove();
}
export function clearInlineImageLayer(layer: InlineImageLayer) {
  layer.entries.forEach(removeEntry); layer.entries.clear();
}

/** Only visible image cells are mounted. Native GIF animation stays off the canvas clock. */
export function updateInlineImageLayer(layer: InlineImageLayer, projectId: string | null, placements: InlineImagePlacement[]) {
  if (!layer.element || !projectId) { clearInlineImageLayer(layer); return; }
  const retained = new Set(placements.map((placement) => placement.key));
  layer.entries.forEach((entry, key) => { if (!retained.has(key)) { removeEntry(entry); layer.entries.delete(key); } });
  for (const placement of placements) {
    const source = `${projectId}:${placement.sticker.id}`;
    let entry = layer.entries.get(placement.key);
    if (!entry || entry.source !== source) {
      if (entry) removeEntry(entry);
      const image = document.createElement("img");
      image.alt = placement.sticker.name;
      image.draggable = false;
      image.hidden = true;
      image.className = "pointer-events-none absolute object-contain";
      image.dataset.inlineImageCell = placement.key;
      entry = { image, source, url: null, cancelled: false };
      layer.entries.set(placement.key, entry);
      layer.element.append(image);
      const current = entry;
      void getStickerBlob(projectId, placement.sticker.id).then((blob) => {
        if (!blob || current.cancelled) return;
        current.url = URL.createObjectURL(blob);
        current.image.src = current.url; current.image.hidden = false;
      }).catch((error) => console.error("Could not load image cell:", error));
    }
    Object.assign(entry.image.style, { left: `${placement.left}px`, top: `${placement.top}px`,
      width: `${placement.width}px`, height: `${placement.height}px`,
      clipPath: `inset(0px ${placement.clipRight ?? 0}px 0px ${placement.clipLeft ?? 0}px)` });
  }
}
