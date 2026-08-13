import { groupThaiCharacters } from "@/lib/karaoke/cursor/lib";
import type { ISentence } from "@/lib/array-range";

const clusterCache = new WeakMap<ISentence, ReturnType<typeof groupThaiCharacters>>();

export interface CanvasSlot {
  index: number;
  progress: number;
  finishedAt: number | null;
  lastUpdate: number;
  dirty: boolean;
}

export interface CanvasTextStyle {
  fontSize: number;
  fontWeight: number | string;
  unsungFill: string;
  unsungStroke: string;
  sungFill: string;
  sungStroke: string;
  fontFamily: string;
  strokeWidth: number;
}

export function makeCanvasSlot(): CanvasSlot {
  return {
    index: -1,
    progress: 0,
    finishedAt: null,
    lastUpdate: performance.now(),
    dirty: true,
  };
}

/**
 * Convert the per-character timestamps into the same left-to-right progress
 * used by the old DOM clip-path renderer. Keeping this calculation here means
 * the Canvas and the timing editor continue to share the exact same timeline.
 */
export function getSentenceProgress(
  tick: number,
  sentence: ISentence | undefined
): number {
  if (!sentence || !sentence.valueName.length || tick < sentence.start) {
    return 0;
  }

  let clusters = clusterCache.get(sentence);
  if (!clusters) {
    clusters = groupThaiCharacters(sentence.text, sentence.valueName);
    clusterCache.set(sentence, clusters);
  }
  if (clusters.length === 0) return 0;

  const lastCluster = clusters[clusters.length - 1];
  const lastCharacter = lastCluster.text[lastCluster.text.length - 1];
  const lastCharacterIndex = sentence.text.lastIndexOf(lastCharacter);
  const lastTick =
    sentence.valueName[lastCharacterIndex] ?? lastCluster.tick ?? sentence.start;

  if (tick >= lastTick) return 1;

  for (let index = 0; index < clusters.length; index += 1) {
    const current = clusters[index];
    const next = clusters[index + 1];
    const nextTick = next?.tick ?? lastTick;

    if (tick >= current.tick && tick < nextTick) {
      const duration = nextTick - current.tick;
      const within = duration > 0 ? (tick - current.tick) / duration : 1;
      return clamp((index + clamp(within, 0, 1)) / clusters.length, 0, 1);
    }
  }

  return 0;
}

/** Advance a two-line slot without involving React state or layout. */
export function updateCanvasSlot(
  slot: CanvasSlot,
  nextIndex: number,
  targetProgress: number,
  now: number,
  lineHoldMs: number,
  jump: boolean
): void {
  if (jump || slot.index === -1) {
    slot.index = nextIndex;
    slot.progress = targetProgress;
    slot.finishedAt = null;
    slot.lastUpdate = now;
    slot.dirty = true;
    return;
  }

  const deltaMs = Math.min(50, Math.max(0, now - slot.lastUpdate));
  slot.lastUpdate = now;

  if (slot.index !== nextIndex) {
    if (slot.progress < 0.999) {
      slot.progress = Math.min(1, slot.progress + deltaMs / 180);
      slot.dirty = true;
      return;
    }

    slot.progress = 1;
    slot.finishedAt ??= now;
    if (now - slot.finishedAt < lineHoldMs) {
      slot.dirty = true;
      return;
    }

    slot.index = nextIndex;
    slot.progress = 0;
    slot.finishedAt = null;
    slot.dirty = true;
    return;
  }

  slot.finishedAt = null;
  const difference = targetProgress - slot.progress;
  if (Math.abs(difference) > 0.0005) {
    slot.progress = clamp(slot.progress + difference * 0.45, 0, 1);
    slot.dirty = true;
  } else if (slot.progress !== targetProgress) {
    slot.progress = targetProgress;
    slot.dirty = true;
  }
}

export function drawCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  progress: number,
  width: number,
  style: CanvasTextStyle
): void {
  if (!text.trim()) return;

  ctx.save();
  ctx.font = `${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const textWidth = ctx.measureText(text).width;
  const maxWidth = width * 0.94;
  const scaleX = textWidth > maxWidth ? maxWidth / textWidth : 1;
  const left = -textWidth / 2;
  const padding = style.strokeWidth + 4;
  const clipRight = left + textWidth * clamp(progress, 0, 1);
  const top = -style.fontSize * 1.5 - padding;
  const height = style.fontSize * 3 + padding * 2;

  ctx.translate(x, y);
  ctx.scale(scaleX, 1);

  ctx.strokeStyle = style.unsungStroke;
  ctx.lineWidth = style.strokeWidth;
  ctx.lineJoin = "round";
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = style.unsungFill;
  ctx.fillText(text, 0, 0);

  if (progress > 0.001) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(left - padding * 2, top, clipRight - left + padding * 2, height);
    ctx.clip();
    ctx.strokeStyle = style.sungStroke;
    ctx.fillStyle = style.sungFill;
    ctx.strokeText(text, 0, 0);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
