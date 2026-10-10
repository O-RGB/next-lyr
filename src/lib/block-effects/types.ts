export const EFFECT_TYPES = ["fire", "lightning", "hearts", "leaves", "rain", "sunny"] as const;
export type EffectType = typeof EFFECT_TYPES[number];
export type WeatherVariant = "clouds" | "storm" | "birds";
export type WeatherStyle = "plain" | WeatherVariant;
export type EffectAtlasRole = "edge" | "base" | "cloud" | "lightning" | "birds";
export interface BlockEffect { type: EffectType; connected: boolean; variant?: WeatherVariant }
export function normalizeBlockEffect(value: unknown): BlockEffect | undefined {
  if (!value || typeof value !== "object") return undefined;
  const effect = value as Partial<BlockEffect>;
  if (!EFFECT_TYPES.includes(effect.type as EffectType)) return undefined;
  const variant = effect.type === "rain" && (effect.variant === "clouds" || effect.variant === "storm")
    || effect.type === "sunny" && (effect.variant === "clouds" || effect.variant === "birds") ? effect.variant : undefined;
  return { type: effect.type as EffectType, connected: effect.connected !== false, ...(variant ? { variant } : {}) };
}
export interface EffectBlock { effect?: BlockEffect; index?: number; lineIndex?: number }
export interface EffectRun { start: number; end: number; effect: BlockEffect }
export function groupEffectBlocks(blocks: readonly EffectBlock[]): EffectRun[] {
  const runs: EffectRun[] = [];
  blocks.forEach((block, index) => {
    const effect = normalizeBlockEffect(block.effect); if (!effect) return;
    const last = runs.at(-1), previous = blocks[index - 1];
    const adjacent = last?.end === index - 1 && previous?.lineIndex === block.lineIndex &&
      (block.index === undefined || previous.index === undefined || block.index === previous.index + 1);
    if (adjacent && effect.connected && last.effect.connected && effect.type === last.effect.type && effect.variant === last.effect.variant) last.end = index;
    else runs.push({ start: index, end: index, effect });
  });
  return runs;
}
export const EFFECT_LABELS: Record<EffectType, [string, string]> = {
  fire: ["ไฟลุก", "Fire"], lightning: ["สายฟ้า", "Lightning"],
  hearts: ["หัวใจ", "Hearts"], leaves: ["ต้นไม้", "Leaves"], rain: ["ฝนตก", "Rain"], sunny: ["ท้องฟ้าแดดใส", "Sunny sky"],
};
export const EFFECT_SHORT_LABELS: Record<EffectType, [string, string]> = {
  fire: ["ไฟ", "Fire"], lightning: ["ฟ้า", "Bolt"],
  hearts: ["ใจ", "Love"], leaves: ["ต้น", "Leaf"], rain: ["ฝน", "Rain"], sunny: ["แดด", "Sun"],
};
export const WEATHER_CHOICES: Partial<Record<EffectType, Array<{ value: WeatherStyle; label: [string, string]; short: [string, string] }>>> = {
  rain: [
    { value: "plain", label: ["ฝนอย่างเดียว", "Rain only"], short: ["ฝน", "Rain"] },
    { value: "clouds", label: ["ฝนและเมฆ", "Rain with clouds"], short: ["ฝนเมฆ", "Rain+"] },
    { value: "storm", label: ["ฝน เมฆ และฟ้าผ่า", "Rain, clouds and lightning"], short: ["พายุ", "Storm"] },
  ],
  sunny: [
    { value: "plain", label: ["แดดแจ่มใส", "Clear sunshine"], short: ["แดด", "Sun"] },
    { value: "clouds", label: ["แดดและเมฆขาว", "Sunshine with white clouds"], short: ["แดดเมฆ", "Sun+"] },
    { value: "birds", label: ["แดด เมฆขาว และนก", "Sunshine, clouds and birds"], short: ["ฟ้านก", "Birds"] },
  ],
};
export function effectLabel(effect: BlockEffect) { return WEATHER_CHOICES[effect.type]?.find(choice => choice.value === (effect.variant ?? "plain"))?.label ?? EFFECT_LABELS[effect.type]; }
export function effectShortLabel(effect: BlockEffect) { return WEATHER_CHOICES[effect.type]?.find(choice => choice.value === (effect.variant ?? "plain"))?.short ?? EFFECT_SHORT_LABELS[effect.type]; }
export function effectIconRole(effect: BlockEffect): EffectAtlasRole {
  if (effect.variant === "storm") return "lightning";
  if (effect.variant === "birds") return "birds";
  return effect.variant === "clouds" ? "cloud" : "edge";
}
export interface EffectChoice { key: string; label: [string, string]; effect?: BlockEffect }
/** Weather variants are complete choices, rather than a second selector after the grid. */
export const EFFECT_CHOICES: EffectChoice[] = [
  { key: "none", label: ["ไม่มีเอฟเฟกต์", "No effect"] },
  ...EFFECT_TYPES.flatMap(type => {
    const weather = WEATHER_CHOICES[type];
    return weather ? weather.map(choice => ({
      key: `${type}:${choice.value}`, label: choice.label,
      effect: normalizeBlockEffect({ type, variant: choice.value === "plain" ? undefined : choice.value }),
    })) : [{ key: type, label: EFFECT_LABELS[type], effect: { type, connected: true } }];
  }),
];
export interface PlaybackFrameAtlas {
  type: EffectType; role?: EffectAtlasRole; id: string; mime: string; width: number; height: number;
  columns: number; rows: number; frames: number; fps: number; base64: string;
}
