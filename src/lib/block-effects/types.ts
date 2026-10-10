export const EFFECT_TYPES = ["fire", "lightning", "hearts", "leaves", "rain", "sunny", "night", "stars", "snow", "petals", "autumn", "aurora", "sunset", "butterflies"] as const;
export type EffectType = typeof EFFECT_TYPES[number];
export type WeatherVariant = "clouds" | "storm" | "birds" | "stars" | "meteors" | "moon" | "butterflies" | "sun" | "petals";
export type WeatherStyle = "plain" | WeatherVariant;
export type EffectAtlasRole = "edge" | "base" | "cloud" | "lightning" | "birds" | "storm" | "stars" | "meteor" | "moon" | "butterflies" | "sun" | "petals";
export interface BlockEffect { type: EffectType; connected: boolean; variant?: WeatherVariant }
export function normalizeBlockEffect(value: unknown): BlockEffect | undefined {
  if (!value || typeof value !== "object") return undefined;
  const effect = value as Partial<BlockEffect>;
  if (!EFFECT_TYPES.includes(effect.type as EffectType)) return undefined;
  const choice = WEATHER_CHOICES[effect.type as EffectType]?.find(choice => choice.value === effect.variant);
  const variant = choice && choice.value !== "plain" ? choice.value : undefined;
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
  night: ["กลางคืน", "Night"], stars: ["ดาว", "Stars"], snow: ["หิมะ", "Snow"], petals: ["กลีบดอกไม้", "Petals"],
  autumn: ["ใบไม้ร่วง", "Autumn"], aurora: ["แสงเหนือ", "Aurora"], sunset: ["ยามเย็น", "Sunset"], butterflies: ["ผีเสื้อ", "Butterflies"],
};
export const EFFECT_SHORT_LABELS: Record<EffectType, [string, string]> = {
  fire: ["ไฟ", "Fire"], lightning: ["ฟ้า", "Bolt"],
  hearts: ["ใจ", "Love"], leaves: ["ต้น", "Leaf"], rain: ["ฝน", "Rain"], sunny: ["แดด", "Sun"],
  night: ["จันทร์", "Moon"], stars: ["ดาว", "Star"], snow: ["หิมะ", "Snow"], petals: ["กลีบ", "Petal"],
  autumn: ["ใบไม้", "Fall"], aurora: ["เหนือ", "Aurora"], sunset: ["เย็น", "Dusk"], butterflies: ["ผีเสื้อ", "Wings"],
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
  night: [
    { value: "plain", label: ["คืนพระจันทร์", "Moonlit night"], short: ["จันทร์", "Moon"] },
    { value: "clouds", label: ["จันทร์และเมฆ", "Moon and clouds"], short: ["คืนเมฆ", "Night+"] },
    { value: "stars", label: ["จันทร์และดาว", "Moon and stars"], short: ["คืนดาว", "Moon★"] },
    { value: "meteors", label: ["จันทร์ ดาว และดาวตก", "Moon, stars and meteors"], short: ["คืนดาวตก", "Moon☄"] },
  ],
  stars: [
    { value: "plain", label: ["ดาวระยิบระยับ", "Twinkling stars"], short: ["ดาว", "Stars"] },
    { value: "meteors", label: ["ดาวและดาวตก", "Stars and meteors"], short: ["ดาวตก", "Meteor"] },
  ],
  snow: [
    { value: "plain", label: ["หิมะโปรย", "Gentle snowfall"], short: ["หิมะ", "Snow"] },
    { value: "clouds", label: ["หิมะและเมฆ", "Snow and clouds"], short: ["เมฆหิมะ", "Snow+"] },
    { value: "moon", label: ["หิมะยามค่ำ", "Snowy moonlit night"], short: ["คืนหิมะ", "Snow☾"] },
  ],
  petals: [
    { value: "plain", label: ["กลีบดอกไม้โปรย", "Drifting petals"], short: ["กลีบ", "Petals"] },
    { value: "butterflies", label: ["กลีบดอกไม้และผีเสื้อ", "Petals and butterflies"], short: ["กลีบปีก", "Petals+"] },
  ],
  autumn: [
    { value: "plain", label: ["ใบไม้สีทองร่วง", "Golden falling leaves"], short: ["ใบไม้", "Autumn"] },
    { value: "sun", label: ["ใบไม้ร่วงและแดดอุ่น", "Autumn leaves and sunshine"], short: ["ใบแดด", "Autumn+"] },
  ],
  aurora: [
    { value: "plain", label: ["แสงเหนือ", "Northern lights"], short: ["แสงเหนือ", "Aurora"] },
    { value: "stars", label: ["แสงเหนือและดาว", "Aurora and stars"], short: ["เหนือดาว", "Aurora★"] },
  ],
  sunset: [
    { value: "plain", label: ["แดดยามเย็น", "Warm evening sun"], short: ["เย็น", "Dusk"] },
    { value: "clouds", label: ["แดดยามเย็นและเมฆ", "Evening sun and clouds"], short: ["เย็นเมฆ", "Dusk+"] },
    { value: "birds", label: ["แดดยามเย็น เมฆ และนก", "Evening sun, clouds and birds"], short: ["เย็นนก", "Dusk birds"] },
  ],
  butterflies: [
    { value: "plain", label: ["ผีเสื้อโบยบิน", "Fluttering butterflies"], short: ["ผีเสื้อ", "Wings"] },
    { value: "petals", label: ["ผีเสื้อและกลีบดอกไม้", "Butterflies and petals"], short: ["ปีกกลีบ", "Wings+"] },
  ],
};
export function effectLabel(effect: BlockEffect) { return WEATHER_CHOICES[effect.type]?.find(choice => choice.value === (effect.variant ?? "plain"))?.label ?? EFFECT_LABELS[effect.type]; }
export function effectShortLabel(effect: BlockEffect) { return WEATHER_CHOICES[effect.type]?.find(choice => choice.value === (effect.variant ?? "plain"))?.short ?? EFFECT_SHORT_LABELS[effect.type]; }
export function effectIconRole(effect: BlockEffect): EffectAtlasRole {
  if (effect.variant === "storm") return "storm";
  if (effect.variant === "birds") return "birds";
  if (effect.variant === "stars") return "stars";
  if (effect.variant === "meteors") return "meteor";
  if (effect.variant === "moon") return "moon";
  if (effect.variant === "butterflies") return "butterflies";
  if (effect.variant === "sun") return "sun";
  if (effect.variant === "petals") return "petals";
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
