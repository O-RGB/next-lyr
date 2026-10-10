const PERIOD = 3200;
const sequenceCache = new Map<string, number[]>();

export function effectSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return hash >>> 0;
}
function mix(value: number) {
  let hash = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  return (hash ^ (hash >>> 16)) >>> 0;
}
/** A bounded schedule avoids repeating the previous cloud, including the loop seam. */
function cloudSequence(seed: number, count: number) {
  const key = seed + ":" + count;
  const cached = sequenceCache.get(key);
  if (cached) return cached;
  const sequence = [seed % count];
  for (let index = 1; index < 32; index++) sequence.push((sequence[index - 1] + 1 + mix(seed + index) % Math.max(1, count - 1)) % count);
  if (count > 1 && sequence[31] === sequence[0]) {
    sequence[31] = Array.from({ length: count }, (_, index) => index).find(index => index !== sequence[30] && index !== sequence[0]) ?? sequence[31];
  }
  if (sequenceCache.size >= 64) sequenceCache.delete(sequenceCache.keys().next().value!);
  sequenceCache.set(key, sequence);
  return sequence;
}
export function stormEvent(time: number, key: string, count: number, long: boolean, reduced = false) {
  const seed = effectSeed(key), shifted = Math.max(0, time) + seed % 700;
  const epoch = reduced ? 0 : Math.floor(shifted / PERIOD), phase = shifted % PERIOD;
  const primary = cloudSequence(seed, Math.max(1, count))[epoch % 32];
  const start = 120 + mix(seed ^ epoch) % 420;
  const active = reduced || phase >= start && phase < start + 180 || phase >= start + 255 && phase < start + 395;
  const multiple = !reduced && long && count >= 3 && epoch % 5 === seed % 5;
  const nextPrimary = cloudSequence(seed, Math.max(1,count))[(epoch + 1) % 32];
  const secondary = multiple ? Array.from({length:count},(_,index)=>index).find(index=>index!==primary&&index!==nextPrimary)! : -1;
  const secondaryActive = multiple && phase >= start + 690 && phase < start + 910;
  return { epoch, primary, secondary, active, secondaryActive };
}
/** Rare shooting stars visit another point; reduced motion omits this transient event. */
export function meteorEvent(time: number, key: string, reduced = false) {
  const seed = effectSeed(key), shifted = Math.max(0, time) + seed % 1700;
  const epoch = Math.floor(shifted / 6200), phase = shifted % 6200;
  const start = 350 + mix(seed ^ epoch) % 900;
  return { visible: !reduced && phase >= start && phase < start + 720,
    center: .2 + mix(seed + epoch * 13) % 600 / 1000, frameTime: Math.max(0, phase - start) };
}
/** Frame painters also redraw at event boundaries, even inside the same sprite cel. */
export function atmosphereEventSignature(effect: { type: string; variant?: string }, time: number, key: string, reduced: boolean) {
  if (effect.variant === "storm") {
    const event = stormEvent(time, key, 3, true, reduced);
    return ":" + event.epoch + ":" + Number(event.active) + Number(event.secondaryActive);
  }
  if (effect.variant === "meteors") {
    const event = meteorEvent(time, key, reduced);
    return ":" + Number(event.visible) + ":" + event.center + ":" + (event.visible?Math.floor(event.frameTime * 16 / 1000):0);
  }
  return "";
}
