import recipes from "./recipes.json";
import type { EffectType } from "./types";
export function effectAppearance(type: EffectType) { return recipes[type].text; }
/** Shared typography for both plain lyrics and every effect preset. */
export const LYRIC_APPEARANCE = {
  idle: ["#fcfe17"], sung: ["#0000ff"],
  stroke: "#000000", sungStroke: "#ffffff", glow: "transparent", editor: "#25334b",
};
