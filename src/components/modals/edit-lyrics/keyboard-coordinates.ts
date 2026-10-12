import type { KeyboardCoordinateGetter } from "@dnd-kit/core";

/** Arrow keys visit lyric rows and the outside gaps where a block leaves a group. */
export const lyricKeyboardCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates, context }) => {
  const direction = event.code === "ArrowDown" ? 1 : event.code === "ArrowUp" ? -1 : 0;
  if (!direction) return undefined;
  event.preventDefault();
  const { active, over, collisionRect, droppableRects, droppableContainers } = context;
  if (!active || !collisionRect) return undefined;
  const candidates = droppableContainers.getEnabled().filter(item => {
    const target = item.data.current?.lyricDrop;
    return target?.kind === "row" || (target?.kind === "gap" && !target.effect);
  }).flatMap(item => {
    const rect = droppableRects.get(item.id);
    const target = item.data.current?.lyricDrop;
    return rect ? [{ id: item.id, rect, key: `${target.kind}:${target.index ?? target.beforeIndex}` }] : [];
  });
  const unique = new Map<string, typeof candidates[number]>();
  for (const candidate of candidates) {
    // Adjacent groups share one outside gap. Keep its active ID so a tie in
    // collision detection cannot trap repeated arrows at the same position.
    if (!unique.has(candidate.key) || candidate.id === over?.id) unique.set(candidate.key, candidate);
  }
  const items = [...unique.values()].sort((left, right) => left.rect.top + left.rect.height / 2 - right.rect.top - right.rect.height / 2);
  const index = items.findIndex(item => item.id === (over?.id ?? active.id));
  const rect = items[index + direction]?.rect;
  if (!rect) return undefined;
  return { x: currentCoordinates.x, y: rect.top + (rect.height - collisionRect.height) / 2 };
};
