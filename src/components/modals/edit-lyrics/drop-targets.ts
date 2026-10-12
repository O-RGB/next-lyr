import type { BlockEffect } from "@next-karaoke/lyrics/effects";

export type LyricDropTarget =
  | { kind: "row"; index: number; effect?: BlockEffect }
  | { kind: "gap"; beforeIndex: number; effect?: BlockEffect };

export interface DropRect { left: number; right: number; top: number; bottom: number }
export interface MeasuredDropTarget { rect: DropRect; target: LyricDropTarget }
export interface DisplayedDropTarget { activeId: string | number; target: LyricDropTarget }

/** Gap indices describe the list before removing the dragged item. */
export function dropDestination(from: number, length: number, target: LyricDropTarget): number {
  const index = target.kind === "row" ? target.index : target.beforeIndex - (from < target.beforeIndex ? 1 : 0);
  return Math.max(0, Math.min(length - 1, index));
}

/** Choose only visible destinations, even when the pointer leaves the viewport. */
export function resolveDragTarget<T extends MeasuredDropTarget>(point: { x: number; y: number }, viewport: DropRect, targets: T[], membershipBounds: DropRect = viewport): (Omit<T, "target"> & { target: LyricDropTarget }) | undefined {
  const outside = point.x < membershipBounds.left || point.x > membershipBounds.right
    || point.y < Math.max(viewport.top, membershipBounds.top) || point.y > Math.min(viewport.bottom, membershipBounds.bottom);
  const destination = (item: T | undefined) => item && outside && item.target.effect
    ? { ...item, target: { ...item.target, effect: undefined } } : item;
  const y = Math.max(viewport.top, Math.min(viewport.bottom, point.y));
  const visible = targets.filter(item => item.rect.bottom >= viewport.top && item.rect.top <= viewport.bottom);
  const hits = visible.filter(item => point.x >= item.rect.left && point.x <= item.rect.right && y >= item.rect.top && y <= item.rect.bottom);
  const gap = hits.find(item => item.target.kind === "gap" && !item.target.effect)
    ?? hits.find(item => item.target.kind === "gap");
  if (gap || hits.length) return destination(gap ?? hits[0]);
  let closest: T | undefined, distance = Infinity;
  for (const item of visible) {
    const center = Math.max(viewport.top, Math.min(viewport.bottom, (item.rect.top + item.rect.bottom) / 2));
    const next = Math.abs(y - center);
    if (next < distance) { closest = item; distance = next; }
  }
  return destination(closest);
}

/** Releasing outside keeps the destination of the last line the user saw. */
export function releaseDropTarget(activeId: string | number, displayed: DisplayedDropTarget | null, fallback?: LyricDropTarget): LyricDropTarget | undefined {
  return displayed?.activeId === activeId ? displayed.target : fallback;
}
