export interface LyricsPreviewViewport {
  start: number;
  size: number;
  editorWidth: number;
  editorHeight: number;
}

export const LYRICS_PREVIEW_VIEWPORT_EVENT =
  "next-lyr:lyrics-preview-viewport";
export const LYRICS_PREVIEW_SCROLL_REQUEST_EVENT =
  "next-lyr:lyrics-preview-scroll-request";

let latestLyricsPreviewViewport: LyricsPreviewViewport = {
  start: 0,
  size: 1,
  editorWidth: 1,
  editorHeight: 1,
};

export function clampLyricsPreviewValue(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function getLyricsPreviewViewport(): LyricsPreviewViewport {
  return latestLyricsPreviewViewport;
}

export function publishLyricsPreviewViewport(
  scroll: HTMLDivElement
): void {
  const scrollSize = Math.max(1, scroll.scrollHeight);
  const viewportSize = Math.max(1, scroll.clientHeight);
  latestLyricsPreviewViewport = {
    start: clampLyricsPreviewValue(scroll.scrollTop / scrollSize),
    size: clampLyricsPreviewValue(viewportSize / scrollSize),
    editorWidth: Math.max(1, scroll.clientWidth),
    editorHeight: Math.max(1, scroll.clientHeight),
  };

  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<LyricsPreviewViewport>(
      LYRICS_PREVIEW_VIEWPORT_EVENT,
      { detail: latestLyricsPreviewViewport }
    )
  );
}

export function requestLyricsPreviewScroll(start: number): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ start: number }>(
      LYRICS_PREVIEW_SCROLL_REQUEST_EVENT,
      { detail: { start: clampLyricsPreviewValue(start) } }
    )
  );
}
