import type { KeyboardCoordinateGetter, UniqueIdentifier } from "@dnd-kit/core";

/** Effect caps are visual rows; arrow keys advance through lyric slots only. */
export const lyricKeyboardCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates, context }) => {
  const direction = event.code === "ArrowDown" ? 1 : event.code === "ArrowUp" ? -1 : 0;
  if (!direction) return undefined;
  event.preventDefault();
  const { active, over, collisionRect, droppableRects } = context;
  const items: UniqueIdentifier[] | undefined = active?.data.current?.sortable?.items;
  if (!active || !collisionRect || !items) return undefined;
  const index = items.indexOf(over?.id ?? active.id), next = items[index + direction];
  const rect = next === undefined ? undefined : droppableRects.get(next);
  if (!rect) return undefined;
  return { x: currentCoordinates.x, y: rect.top + (rect.height - collisionRect.height) / 2 };
};
