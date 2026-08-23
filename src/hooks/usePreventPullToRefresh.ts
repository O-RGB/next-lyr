"use client";

import { useEffect } from "react";

/** Keep iOS pull-to-refresh/rubber-band on the editor viewport, not the page. */
export default function usePreventPullToRefresh() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const touchPosition: { x: number; y: number } = { x: 0, y: 0 };
    let hasTouch = false;

    html.classList.add("editor-viewport-lock");
    body.classList.add("editor-viewport-lock");

    const findScrollableParent = (target: EventTarget | null) => {
      let element = target instanceof HTMLElement ? target : null;

      while (
        element &&
        element !== document.body &&
        element !== document.documentElement
      ) {
        const style = window.getComputedStyle(element);
        const canScrollVertically =
          /(auto|scroll|overlay)/.test(style.overflowY) &&
          element.scrollHeight > element.clientHeight;

        if (canScrollVertically) return element;
        element = element.parentElement;
      }

      return null;
    };

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch || event.touches.length !== 1) {
        hasTouch = false;
        return;
      }

      touchPosition.x = touch.clientX;
      touchPosition.y = touch.clientY;
      hasTouch = true;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch || !hasTouch) return;

      const deltaX = touch.clientX - touchPosition.x;
      const deltaY = touch.clientY - touchPosition.y;
      touchPosition.x = touch.clientX;
      touchPosition.y = touch.clientY;

      // Leave horizontal lyric gestures alone.
      if (Math.abs(deltaY) <= Math.abs(deltaX)) return;

      const scrollableParent = findScrollableParent(event.target);
      if (!scrollableParent) {
        if (deltaY > 0 && event.cancelable) event.preventDefault();
        return;
      }

      const atTop = scrollableParent.scrollTop <= 0;
      const atBottom =
        scrollableParent.scrollTop + scrollableParent.clientHeight >=
        scrollableParent.scrollHeight - 1;

      // Stop an edge swipe from escaping the editor and refreshing the page.
      if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
        if (event.cancelable) event.preventDefault();
      }
    };

    const clearTouch = () => {
      hasTouch = false;
    };

    document.addEventListener("touchstart", handleTouchStart, {
      capture: true,
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove, {
      capture: true,
      passive: false,
    });
    document.addEventListener("touchend", clearTouch, true);
    document.addEventListener("touchcancel", clearTouch, true);

    return () => {
      html.classList.remove("editor-viewport-lock");
      body.classList.remove("editor-viewport-lock");
      document.removeEventListener("touchstart", handleTouchStart, true);
      document.removeEventListener("touchmove", handleTouchMove, true);
      document.removeEventListener("touchend", clearTouch, true);
      document.removeEventListener("touchcancel", clearTouch, true);
    };
  }, []);
}
