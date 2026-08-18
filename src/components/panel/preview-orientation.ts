export function isPreviewHorizontal(width: number, height: number): boolean {
  // Orientation follows the actual preview panel, just like the Chord
  // overview. A portrait phone can still contain a wide, horizontal preview
  // strip, so device orientation must not override the panel geometry.
  return width >= height * 1.35;
}
