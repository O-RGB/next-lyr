import { frameAtTime } from "@/lib/block-effects/catalog";
import { effectAppearance } from "@/lib/block-effects/appearance";
import { frameAtlasIdentity, loadFrameAtlas, type LoadedAtlas } from "@/lib/block-effects/frames";
import { subscribeFramePainter, refreshFramePainter } from "@/lib/block-effects/animation";
import { effectIconRole, type BlockEffect } from "@/lib/block-effects/types";

export interface EffectGroupControl {
  key: string; effect: BlockEffect; indices: number[]; lineIndex: number;
  start: number; end: number; top: number; capWidth: number; boxHeight: number; rangeY: number;
  rowTop: number; rowHeight: number; clipLeft: number; clipRight: number;
  label: string; title: string; background: string; disabled?: boolean; muted?: boolean;
}
interface Entry {
  element: HTMLDivElement; buttons: HTMLButtonElement[]; icons: HTMLCanvasElement[];
  range: HTMLButtonElement; path: SVGPathElement; placement: EffectGroupControl;
  atlas?: LoadedAtlas; atlasKey: string; request: number; lastFrame: number; disposed: boolean;
}
export interface EffectGroupLayer {
  element: HTMLDivElement | null; viewport?: HTMLDivElement; entries: Map<string, Entry>;
  unsubscribe?: () => void; painter?: (time: number, reduced: boolean) => void;
  onEdit?: (placement: EffectGroupControl) => void;
  onScroll?: (placement: EffectGroupControl, delta: number) => void;
}
export const makeEffectGroupLayer = (): EffectGroupLayer => ({ element: null, entries: new Map() });
export function clearEffectGroupLayer(layer: EffectGroupLayer) {
  layer.unsubscribe?.(); layer.unsubscribe = undefined; layer.painter = undefined;
  for (const entry of layer.entries.values()) { entry.disposed = true; entry.element.remove(); }
  layer.entries.clear(); layer.viewport?.remove(); layer.viewport = undefined;
}

function paintIcon(canvas: HTMLCanvasElement, atlas: LoadedAtlas, index: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2), size = 16;
  canvas.width = size * dpr; canvas.height = size * dpr;
  const ctx = canvas.getContext("2d"); if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size);
  const rect = atlas.rects[index], shape = atlas.shapes[index];
  const scale = Math.min(14 / shape.width, 14 / shape.height);
  const width = shape.width * scale, height = shape.height * scale;
  ctx.drawImage(atlas.image, rect.x + shape.left, rect.y + shape.top, shape.width, shape.height,
    (size - width) / 2, (size - height) / 2, width, height);
}

/** Visible editor controls are pooled so the playback clock never rerenders React. */
export function updateEffectGroupLayer(layer: EffectGroupLayer, placements: EffectGroupControl[], height: number,
  onEdit: (placement: EffectGroupControl) => void, onScroll?: (placement: EffectGroupControl, delta: number) => void) {
  if (!layer.element) { clearEffectGroupLayer(layer); return; }
  layer.onEdit = onEdit;
  layer.onScroll = onScroll;
  if (!layer.viewport) {
    const viewport = document.createElement("div");
    Object.assign(viewport.style, { position: "absolute", inset: "0 auto auto 0", width: "100%", overflow: "hidden", pointerEvents: "none" });
    layer.element.append(viewport); layer.viewport = viewport;
  }
  layer.viewport.style.height = `${height}px`;
  const retained = new Set(placements.map(p => p.key));
  for (const [key, entry] of layer.entries) if (!retained.has(key)) {
    entry.disposed = true; entry.element.remove(); layer.entries.delete(key);
  }
  for (const placement of placements) {
    let entry = layer.entries.get(placement.key);
    if (!entry) {
      const element = document.createElement("div"), buttons: HTMLButtonElement[] = [], icons: HTMLCanvasElement[] = [];
      Object.assign(element.style, { position: "absolute", overflow: "hidden", pointerEvents: "none" });
      const range = document.createElement("button"), svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      range.type = "button"; range.tabIndex = -1; range.dataset.effectRange = placement.key;
      Object.assign(range.style, { position: "absolute", padding: "0", border: "0", background: "transparent", pointerEvents: "auto", cursor: "pointer" });
      svg.setAttribute("aria-hidden", "true"); path.setAttribute("fill", "none"); path.setAttribute("stroke-width", "1.5"); path.setAttribute("stroke-linejoin", "round");
      svg.append(path); range.append(svg); element.append(range);
      for (const side of ["start", "end"]) {
        const button = document.createElement("button"), body = document.createElement("span");
        const icon = document.createElement("canvas"), label = document.createElement("span");
        button.type = "button"; button.dataset.effectBoundary = side;
        button.className = "absolute cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";
        Object.assign(button.style, { padding: "6px 4px", background: "transparent", border: "0", pointerEvents: "auto", touchAction: "pan-y" });
        body.className = "flex h-full items-center justify-center gap-1 rounded-md border text-[10px] font-semibold";
        icon.style.width = "16px"; icon.style.height = "16px"; icon.setAttribute("aria-hidden", "true");
        label.dataset.effectLabel = ""; body.append(icon, label); button.append(body); element.append(button);
        buttons.push(button); icons.push(icon);
      }
      entry = { element, buttons, icons, range, path, placement, atlasKey: "", request: 0, lastFrame: -1, disposed: false };
      const current = entry;
      for (const button of [...buttons, range]) {
        let drag: { x: number; y: number; lastX: number; moved: boolean } | undefined, skipClick = false;
        button.onclick = event => { event.stopPropagation(); if(skipClick){skipClick=false;return;}layer.onEdit?.(current.placement); };
        button.onpointerdown = event => { event.stopPropagation(); skipClick=false;drag={x:event.clientX,y:event.clientY,lastX:event.clientX,moved:false}; };
        button.onpointermove = event => {
          if(!drag||!layer.onScroll)return;
          if(!drag.moved && (Math.abs(event.clientX-drag.x)<6||Math.abs(event.clientX-drag.x)<Math.abs(event.clientY-drag.y)))return;
          drag.moved=true;button.setPointerCapture(event.pointerId);event.preventDefault();
          layer.onScroll(current.placement,drag.lastX-event.clientX);drag.lastX=event.clientX;
        };
        button.onpointerup = event => { if(drag?.moved){skipClick=true;event.preventDefault();}drag=undefined;if(button.hasPointerCapture(event.pointerId))button.releasePointerCapture(event.pointerId); };
        button.onpointercancel = () => { drag=undefined;skipClick=false; };
        button.onwheel = event => { const delta=event.deltaX||(event.shiftKey?event.deltaY:0);if(delta&&layer.onScroll){event.preventDefault();layer.onScroll(current.placement,delta);} };
        button.onkeydown = event => { if (event.key === "Enter" || event.key === " ") event.stopPropagation(); };
      }
      layer.entries.set(placement.key, entry); layer.viewport.append(element);
    }
    entry.placement = placement;
    const color = effectAppearance(placement.effect.type).glow;
    Object.assign(entry.element.style, { left: `${placement.clipLeft}px`, top: `${placement.rowTop}px`,
      width: `${Math.max(1, placement.clipRight - placement.clipLeft)}px`, height: `${placement.rowHeight}px`, opacity: placement.muted ? ".5" : "1" });
    for (const [index, button] of entry.buttons.entries()) {
      const left = index ? placement.end : placement.start;
      const visible = left + placement.capWidth > placement.clipLeft && left < placement.clipRight;
      if(button.hidden===visible)entry.lastFrame=-1;
      button.hidden = !visible; button.disabled = !!placement.disabled; button.tabIndex = visible && !placement.disabled ? 0 : -1;
      button.title = placement.title; button.setAttribute("aria-label", placement.title);
      button.dataset.effectType = placement.effect.type; button.dataset.effectVariant = placement.effect.variant ?? "plain"; button.dataset.effectIndices = placement.indices.join(",");
      Object.assign(button.style, { left: `${left - placement.clipLeft - 4}px`, top: `${placement.top - placement.rowTop - 6}px`,
        width: `${placement.capWidth + 8}px`, height: `${placement.boxHeight + 12}px`, pointerEvents: placement.disabled ? "none" : "auto",touchAction:onScroll?"pan-y":"auto" });
      const body = button.firstElementChild as HTMLElement;
      Object.assign(body.style, { color: "var(--foreground)", background: placement.background, borderColor: `${color}90`, borderRadius: "5px" });
      button.querySelector<HTMLElement>("[data-effect-label]")!.textContent = placement.label;
    }
    const span = Math.max(1, placement.end - placement.start), drop = Math.max(1, placement.rangeY - placement.top - placement.boxHeight);
    const rangeWidth = span + 2, rangeHeight = drop + 2;
    Object.assign(entry.range.style, { left: `${placement.start + placement.capWidth / 2 - placement.clipLeft - 1}px`,
      top: `${placement.top + placement.boxHeight - placement.rowTop}px`, width: `${rangeWidth}px`, height: `${rangeHeight}px`,
      pointerEvents: placement.disabled ? "none" : "auto" });
    entry.range.style.touchAction=onScroll?"pan-y":"auto";
    entry.range.disabled = !!placement.disabled; entry.range.title = placement.title; entry.range.setAttribute("aria-label", placement.title);
    const svg = entry.range.firstElementChild!;
    svg.setAttribute("width", String(rangeWidth)); svg.setAttribute("height", String(rangeHeight));
    entry.path.setAttribute("d", `M1 0 V${drop} H${span + 1} V0`); entry.path.setAttribute("stroke", color); entry.path.setAttribute("opacity", ".65");
    const atlasKey = frameAtlasIdentity(placement.effect.type,effectIconRole(placement.effect));
    if (entry.atlasKey !== atlasKey) {
      entry.atlasKey = atlasKey; entry.atlas = undefined; entry.lastFrame = -1;
      const current = entry, request = ++entry.request;
      void loadFrameAtlas(placement.effect.type,effectIconRole(placement.effect)).then(atlas => {
        if (current.disposed || current.request !== request) return;
        current.atlas = atlas; current.lastFrame = -1;
        if (layer.painter) refreshFramePainter(layer.painter);
      }).catch(error => console.error("Could not load effect block icon", error));
    }
  }
  if (!layer.entries.size) { layer.unsubscribe?.(); layer.unsubscribe = undefined; return; }
  if (!layer.painter) layer.painter = (time, reduced) => {
    for (const entry of layer.entries.values()) {
      if (!entry.atlas || entry.disposed) continue;
      const index = frameAtTime(time, entry.atlas.frames, entry.atlas.fps, reduced);
      if (index === entry.lastFrame) continue;
      entry.icons.forEach((icon, side) => { if (!entry.buttons[side].hidden) paintIcon(icon, entry.atlas!, (index + (side ? 5 : 0)) % entry.atlas!.frames); });
      entry.lastFrame = index;
    }
  };
  if (!layer.unsubscribe) layer.unsubscribe = subscribeFramePainter(layer.painter); else refreshFramePainter(layer.painter);
}
