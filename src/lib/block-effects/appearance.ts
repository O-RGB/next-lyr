import recipes from "./recipes.json";
import type { EffectType } from "./types";
import type { CanvasTextStyle } from "@/components/lyrics/karaoke-lyrics/canvas-renderer";
export function effectAppearance(type: EffectType) { return recipes[type].text; }
/** The editor, live player and standalone preview share the same colored letter treatment. */
export function withEffectTextStyle(base: CanvasTextStyle, type?: EffectType): CanvasTextStyle {
  if (!type) return base;
  const theme = effectAppearance(type);
  return { ...base, unsungGradient: theme.idle, sungGradient: theme.sung,
    unsungStroke: theme.stroke, sungStroke: theme.activeStroke,
    glowColor: theme.glow, glowBlur: base.fontSize * .07, strokeWidth: Math.max(.65, base.fontSize * .06) };
}
/** Shared typography for both plain lyrics and every effect preset. */
export const LYRIC_APPEARANCE = {
  idle: ["#fcfe17"], sung: ["#0000ff"],
  stroke: "#000000", sungStroke: "#ffffff", glow: "transparent", editor: "#25334b",
};

export function defaultLyricTextStyle(fontSize: number, fontFamily: string): CanvasTextStyle {
  return {
    fontSize, fontFamily, fontWeight: 700,
    unsungFill: LYRIC_APPEARANCE.idle[0], unsungStroke: LYRIC_APPEARANCE.stroke,
    sungFill: LYRIC_APPEARANCE.sung[0], sungStroke: LYRIC_APPEARANCE.sungStroke,
    strokeWidth: Math.max(fontSize * .065, 1.4), glowColor: "transparent", glowBlur: 0,
  };
}
