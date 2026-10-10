import recipes from "./recipes.json";
import weatherAssets from "./weather-assets.json";
import { normalizeBlockEffect, type EffectType, type BlockEffect, type EffectAtlasRole } from "./types";
export const EFFECT_RENDERER = "attached-sprite-frames-v9";
export const EFFECT_LAYOUT = {
  edgeScale: .66, edgeOutset: 1.12, headroom: .95, bottomPad: .22,
  rootInset: .08, rootRise: .24, edgeAngle: Math.PI * .34,
  fireLengthScale: .92, fireHeightScale: .63,
  // Horizontal flame cels sit above their root more than the angled bolt does.
  fireRootDrop: .045,
} as const;
export const EFFECT_COMMON = { alignment: "glyph-edge-emitter", playback: "discrete-frames", backdrop: "transparent", underline: false, gutter: { top: .02, side: .0075, bottom: .01 } } as const;
export function effectRecipe(type: EffectType) { return recipes[type]; }
export interface EffectRenderProfile {
  attachment: "cluster" | "sprout" | "rain" | "sky"; layer: "front" | "behind";
  width: number; height: number; anchorX: number; anchorY: number; inset: number; headroom?: number;
}
export function effectRenderProfile(value: EffectType | BlockEffect): EffectRenderProfile | undefined {
  const effect=typeof value==='string'?{type:value,connected:true}:value;
  const recipe=effectRecipe(effect.type),profile="render" in recipe ? recipe.render as EffectRenderProfile : undefined;
  return effect.type==='rain'&&effect.variant ? {...profile!,headroom:1.7} : profile;
}
export function effectHeadroom(type?: EffectType | BlockEffect): number {
  return type ? effectRenderProfile(type)?.headroom ?? EFFECT_LAYOUT.headroom : EFFECT_LAYOUT.headroom;
}
export function effectAtlasRoles(value: EffectType | BlockEffect): EffectAtlasRole[] {
  const effect=typeof value==='string'?{type:value,connected:true}:value;
  if(!Object.hasOwn(recipes,effect.type))return [];
  if(effect.type==='rain'&&effect.variant==='storm')return ['edge','cloud','lightning'];
  if(effect.type==='sunny'&&effect.variant==='birds')return ['edge','cloud','birds'];
  if((effect.type==='rain'||effect.type==='sunny')&&effect.variant==='clouds')return ['edge','cloud'];
  return ['edge'];
}
export function effectAtlasRecipe(type: EffectType, role: EffectAtlasRole = "edge") {
  if(role==='cloud'&&(type==='rain'||type==='sunny'))return type==='rain'?weatherAssets.cloud_dark:weatherAssets.cloud_white;
  if(role==='lightning'&&type==='rain')return recipes.lightning.atlas;
  if(role==='birds'&&type==='sunny')return weatherAssets.birds;
  if(role!=='edge')throw new Error(`unexpected-${role}-atlas`);
  return recipes[type].atlas;
}
/** Required role bindings are derived from blocks, including their weather style. */
export function usedEffectAtlasRoles(lines: readonly (readonly { effect?: BlockEffect }[])[]) {
  const uses=new Map<string,{type:EffectType;role:EffectAtlasRole}>();
  for(const word of lines.flat()){
    const effect=normalizeBlockEffect(word.effect);if(!effect)continue;
    for(const role of effectAtlasRoles(effect))uses.set(`${effect.type}:${role}`,{type:effect.type,role});
  }
  return [...uses.values()];
}
export function effectGeometry(textWidth: number, textHeight: number, type?: EffectType | BlockEffect) {
  const edge = Math.max(1, textHeight) * EFFECT_LAYOUT.edgeScale;
  const baseline = Math.max(1, textHeight) * effectHeadroom(type);
  const outset = type && effectRecipe(typeof type==='string'?type:type.type).edgeCount === 0 ? 0 : edge * EFFECT_LAYOUT.edgeOutset;
  return { outset, rise: baseline, width: Math.max(1, textWidth) + 2 * outset,
    height: baseline + Math.max(1, textHeight) * EFFECT_LAYOUT.bottomPad, baseline, edge };
}
export function frameAtTime(milliseconds: number, frames: number, fps: number, reducedMotion = false) {
  if (reducedMotion) return Math.floor(frames / 2);
  return Math.floor(Math.max(0, milliseconds) * fps / 1000) % Math.max(1, frames);
}
