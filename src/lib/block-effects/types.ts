export const EFFECT_TYPES = ["lightning"] as const;
export type EffectType = typeof EFFECT_TYPES[number];
export interface BlockEffect { type: EffectType; connected: boolean }
export function normalizeBlockEffect(value: unknown): BlockEffect | undefined {
  if (!value || typeof value !== "object") return undefined;
  const effect = value as Partial<BlockEffect>;
  return EFFECT_TYPES.includes(effect.type as EffectType) ? { type: effect.type as EffectType, connected: effect.connected !== false } : undefined;
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
    if (adjacent && effect.connected && last.effect.connected && effect.type === last.effect.type) last.end = index;
    else runs.push({ start: index, end: index, effect });
  });
  return runs;
}
export const EFFECT_LABELS: Record<EffectType, [string, string]> = { lightning: ["สายฟ้า", "Lightning"] };
export interface PlaybackFrameAtlas {
  type: EffectType; id: string; mime: string; width: number; height: number;
  columns: number; rows: number; frames: number; fps: number; base64: string;
}
