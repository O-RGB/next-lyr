"use client";

import { useEffect, useRef } from "react";
import { defaultLyricTextStyle } from "@/lib/block-effects/appearance";
import type { LyricCellDraft } from "@/lib/karaoke/inline-content";
import { drawInlineLyricLine } from "@/components/lyrics/karaoke-lyrics/inline-renderer";
import { makeCanvasMediaLayer, updateCanvasMediaLayer, clearCanvasMediaLayer } from "@/components/lyrics/canvas-media-layer";
import { useSettingsStore } from "@/features/settings/settings-store";
import { text } from "@/features/settings/locale";

export function LyricDraftPreview({ cells, projectId }: { cells: LyricCellDraft[]; projectId: string | null }) {
  const ref = useRef<HTMLCanvasElement>(null), layer = useRef(makeCanvasMediaLayer());
  const locale = useSettingsStore(state => state.uiLocale);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let disposed = false;
    const paint = () => {
      if (disposed) return;
      const width = canvas.clientWidth, height = 92, dpr = Math.min(devicePixelRatio || 1, 2);
      if (!width) return;
      canvas.width = Math.round(width * dpr); canvas.height = height * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const style = defaultLyricTextStyle(30, getComputedStyle(canvas).fontFamily || "sans-serif");
      const words = cells.map((cell, index) => ({
        text: cell.text || "…", vocal: cell.vocal, kind: cell.kind, sticker: cell.sticker,
        effect: cell.effect, index, lineIndex: 0, at: 1,
      }));
      const scene = drawInlineLyricLine(ctx, words, 0, width, 55, style, "draft");
      updateCanvasMediaLayer(layer.current, canvas, projectId, scene.images, scene.effects);
    };
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    paint();
    void document.fonts.ready.then(paint);
    return () => { disposed = true; observer.disconnect(); };
  }, [cells, projectId]);
  useEffect(() => { const current = layer.current; return () => clearCanvasMediaLayer(current); }, []);
  return <canvas ref={ref} data-lyric-draft-preview role="img"
    aria-label={`${text(locale, "ตัวอย่างเนื้อร้อง", "Lyric preview")}: ${cells.map(cell => cell.kind === "image" ? cell.sticker?.name ?? "" : cell.text).join(" ")}`}
    className="h-[92px] w-full rounded-lg bg-base" style={{ fontFamily: "var(--font-lyrics)" }} />;
}
