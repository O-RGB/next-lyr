import recipes from "./recipes.json";
import type { EffectType } from "./types";
export const EFFECT_RENDERER = "attached-sprite-frames-v6";
export const EFFECT_LAYOUT = {
  edgeScale: .66, edgeOutset: 1.12, headroom: .95, bottomPad: .22,
  rootInset: .08, rootRise: .14, edgeAngle: Math.PI * .34,
} as const;
export const EFFECT_COMMON = { alignment: "glyph-edge-emitter", playback: "discrete-frames", backdrop: "transparent", underline: false, gutter: { top: .02, side: .0075, bottom: .01 } } as const;
export function effectRecipe(type: EffectType) { return recipes[type]; }
export function effectGeometry(textWidth: number, textHeight: number) {
  const edge = Math.max(1, textHeight) * EFFECT_LAYOUT.edgeScale;
  const baseline = Math.max(1, textHeight) * EFFECT_LAYOUT.headroom, outset = edge * EFFECT_LAYOUT.edgeOutset;
  return { outset, rise: baseline, width: Math.max(1, textWidth) + 2 * outset,
    height: baseline + Math.max(1, textHeight) * EFFECT_LAYOUT.bottomPad, baseline, edge };
}
export function frameAtTime(milliseconds: number, frames: number, fps: number, reducedMotion = false) {
  if (reducedMotion) return Math.floor(frames / 2);
  return Math.floor(Math.max(0, milliseconds) * fps / 1000) % Math.max(1, frames);
}
