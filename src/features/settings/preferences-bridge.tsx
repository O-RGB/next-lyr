"use client";

import { useEffect } from "react";
import { getFontFamily, useFontStore } from "./font-store";
import { useSettingsStore } from "./settings-store";

/** Applies persisted language and font choices before Canvas starts measuring text. */
export function PreferencesBridge() {
  const locale = useSettingsStore((state) => state.uiLocale);
  const uiFontId = useSettingsStore((state) => state.uiFontId);
  const lyricsFontId = useSettingsStore((state) => state.lyricsFontId);
  const customFonts = useFontStore((state) => state.customFonts);
  const loadFonts = useFontStore((state) => state.load);

  useEffect(() => {
    void loadFonts();
  }, [loadFonts]);

  useEffect(() => {
    const root = document.documentElement;
    const uiFont = getFontFamily(uiFontId, customFonts);
    const lyricsFont = getFontFamily(lyricsFontId, customFonts);
    root.lang = locale;
    root.dataset.locale = locale;
    root.style.setProperty("--font-ui", uiFont);
    root.style.setProperty("--font-lyrics", lyricsFont);
    // Tailwind's font-sans utility is used throughout the existing editor.
    root.style.setProperty("--font-sans", "var(--font-ui)");
    root.style.setProperty("--font-heading", "var(--font-ui)");
  }, [customFonts, lyricsFontId, locale, uiFontId]);

  return null;
}
