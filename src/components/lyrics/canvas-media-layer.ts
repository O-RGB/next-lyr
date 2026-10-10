import { acquireCanvasAsset, type CanvasAsset } from "@/lib/stickers/canvas-assets";
import type { LyricSticker } from "@/lib/stickers/types";
import { loadFrameAtlas, frameAtlasIdentity, type LoadedAtlas } from "@/lib/block-effects/frames";
import { frameAtTime, effectRenderProfile, effectAtlasRoles } from "@/lib/block-effects/catalog";
import { subscribeFramePainter } from "@/lib/block-effects/animation";
import type { EffectType, EffectAtlasRole, BlockEffect } from "@/lib/block-effects/types";
import { atmosphereEventSignature } from "@/lib/block-effects/events";
import { drawEffectFrame, type EffectPlacement } from "./block-effect-layer";

export interface CanvasImagePlacement {
  key: string; sticker: LyricSticker; left: number; top: number; width: number; height: number;
  clipLeft?: number; clipRight?: number;
}
interface Lease { asset: CanvasAsset; release(): void }
interface AtlasEntry { atlas?: LoadedAtlas; disposed: boolean }
export interface CanvasMediaLayer {
  canvas?: HTMLCanvasElement; base?: HTMLCanvasElement; projectId: string | null;
  images: CanvasImagePlacement[]; effects: EffectPlacement[];
  leases: Map<string, Lease>; atlases: Map<string, AtlasEntry>;
  unsubscribe?: () => void; signature: string; disposed: boolean;
}
export const makeCanvasMediaLayer = (): CanvasMediaLayer => ({
  projectId: null, images: [], effects: [], leases: new Map(), atlases: new Map(), signature: "", disposed: false,
});

export function clearCanvasMediaLayer(layer: CanvasMediaLayer) {
  layer.disposed = true; layer.unsubscribe?.(); layer.unsubscribe = undefined;
  for (const lease of layer.leases.values()) lease.release();
  for (const entry of layer.atlases.values()) entry.disposed = true;
  layer.leases.clear(); layer.atlases.clear(); layer.images = []; layer.effects = [];
  if (layer.base) { layer.base.width = 0; layer.base.height = 0; }
  layer.base = undefined; layer.canvas = undefined; layer.signature = "";
}
const imageKey = (projectId: string | null, sticker: LyricSticker) => `${projectId}:${sticker.id}`;
const atlasKey = (type: EffectType,role:EffectAtlasRole='edge') => frameAtlasIdentity(type,role);
function componentsFor(layer:CanvasMediaLayer,effect:BlockEffect) {
  const components:Partial<Record<EffectAtlasRole,LoadedAtlas>>={};
  for(const role of effectAtlasRoles(effect))components[role]=layer.atlases.get(atlasKey(effect.type,role))?.atlas;
  return components;
}
function paint(layer: CanvasMediaLayer, time: number, reduced: boolean, force = false) {
  const { canvas, base } = layer;
  if (layer.disposed || !canvas || !base || canvas.width !== base.width || canvas.height !== base.height) return;
  const box = canvas.getBoundingClientRect();
  if (!box.width || !box.height || box.bottom < 0 || box.top > innerHeight || box.right < 0 || box.left > innerWidth) return;
  for (const lease of layer.leases.values()) lease.asset.request(time, reduced);
  const signature = [...layer.leases.values()].map(lease => lease.asset.version).join(",") + ":" + layer.effects.map(effect => {
    return effectAtlasRoles(effect.effect).map(role=>{
      const atlas=layer.atlases.get(atlasKey(effect.effect.type,role))?.atlas;
      return atlas?frameAtTime(time,atlas.frames,atlas.fps,reduced):-1;
    }).join('/')+atmosphereEventSignature(effect.effect,time,effect.key,reduced);
  }).join(",");
  if (!force && signature === layer.signature) return;
  layer.signature = signature;
  const context = canvas.getContext("2d"); if (!context) return;
  context.save(); context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, canvas.width, canvas.height);
  const dpr = canvas.width / Math.max(1, canvas.clientWidth);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const placement of layer.effects) {
    if (effectRenderProfile(placement.effect)?.layer !== "behind") continue;
    const atlas = layer.atlases.get(atlasKey(placement.effect.type))?.atlas;
    if (atlas) drawEffectFrame(context, atlas, placement, time, reduced,componentsFor(layer,placement.effect));
  }
  context.setTransform(1, 0, 0, 1, 0, 0); context.drawImage(base, 0, 0);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const placement of layer.effects) {
    if (effectRenderProfile(placement.effect)?.layer === "behind") continue;
    const atlas = layer.atlases.get(atlasKey(placement.effect.type))?.atlas;
    if (atlas) drawEffectFrame(context, atlas, placement, time, reduced,componentsFor(layer,placement.effect));
  }
  for (const placement of layer.images) {
    const asset = layer.leases.get(imageKey(layer.projectId, placement.sticker))?.asset;
    if (!asset?.source || !asset.width || !asset.height) continue;
    const scale = Math.min(placement.width / asset.width, placement.height / asset.height);
    const width = asset.width * scale, height = asset.height * scale;
    context.save(); context.beginPath();
    context.rect(placement.left + (placement.clipLeft ?? 0), placement.top,
      Math.max(0, placement.width - (placement.clipLeft ?? 0) - (placement.clipRight ?? 0)), placement.height);
    context.clip(); context.drawImage(asset.source, placement.left + (placement.width - width) / 2,
      placement.top + (placement.height - height) / 2, width, height); context.restore();
  }
  context.restore();
}
function synchronizeAnimation(layer: CanvasMediaLayer) {
  const animated = [...layer.leases.values()].some(lease => lease.asset.delays.length > 1 && !lease.asset.failed)
    || [...layer.atlases.values()].some(entry => entry.atlas);
  if (animated && !layer.unsubscribe) layer.unsubscribe = subscribeFramePainter((time, reduced) => paint(layer, time, reduced));
  else if (!animated) { layer.unsubscribe?.(); layer.unsubscribe = undefined; }
}
function changed(layer: CanvasMediaLayer) {
  if (layer.disposed) return;
  synchronizeAnimation(layer);
  paint(layer, performance.now(), window.matchMedia("(prefers-reduced-motion: reduce)").matches, true);
}

/** Capture text/layout once; changing media frames reuse it on the same visible canvas. */
export function updateCanvasMediaLayer(layer: CanvasMediaLayer, canvas: HTMLCanvasElement,
  projectId: string | null, images: CanvasImagePlacement[], effects: EffectPlacement[] = []) {
  layer.disposed = false; layer.canvas = canvas; layer.projectId = projectId;
  layer.images = projectId ? images : []; layer.effects = effects;
  const retained = new Set(layer.images.map(image => imageKey(projectId, image.sticker)));
  for (const [key, lease] of layer.leases) if (!retained.has(key)) { lease.release(); layer.leases.delete(key); }
  for (const image of layer.images) {
    const key = imageKey(projectId, image.sticker);
    if (!layer.leases.has(key)) layer.leases.set(key, acquireCanvasAsset(projectId!, image.sticker, () => changed(layer)));
  }
  const retainedAtlases = new Set(effects.flatMap(effect=>effectAtlasRoles(effect.effect).map(role=>atlasKey(effect.effect.type,role))));
  for (const [key, entry] of layer.atlases) if (!retainedAtlases.has(key)) { entry.disposed = true; layer.atlases.delete(key); }
  for (const effect of effects) for(const role of effectAtlasRoles(effect.effect)) {
    const key = atlasKey(effect.effect.type,role);
    if (!layer.atlases.has(key)) {
      const entry: AtlasEntry = { disposed: false }; layer.atlases.set(key, entry);
      void loadFrameAtlas(effect.effect.type,role).then(atlas => {
        if (entry.disposed) return;
        entry.atlas = atlas; changed(layer);
      }).catch(error => console.error("Could not load lyric effect", error));
    }
  }
  // A scene containing only text needs no cached surface or animation loop.
  if (!layer.images.length && !effects.length) {
    if (layer.base) { layer.base.width = 0; layer.base.height = 0; layer.base = undefined; }
    synchronizeAnimation(layer); return;
  }
  const base = layer.base ??= document.createElement("canvas");
  if (base.width !== canvas.width || base.height !== canvas.height) { base.width = canvas.width; base.height = canvas.height; }
  const context = base.getContext("2d"); if (!context) return;
  context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, base.width, base.height); context.drawImage(canvas, 0, 0);
  changed(layer);
}
