"use client";

import { useEffect, useRef } from "react";
import { frameAtTime } from "@/lib/block-effects/catalog";
import { subscribeFramePainter } from "@/lib/block-effects/animation";
import { loadFrameAtlas, frameAtlasIdentity, type LoadedAtlas } from "@/lib/block-effects/frames";
import { paintEffectIcon } from "@/lib/block-effects/icon";
import { effectIconRole, type BlockEffect } from "@/lib/block-effects/types";

export function EffectIcon({ effect, size = 20 }: { effect: BlockEffect; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const role = effectIconRole(effect), identity = frameAtlasIdentity(effect.type, role);
  useEffect(() => {
    let disposed = false, visible = false, requested = false, atlas: LoadedAtlas | undefined;
    let unsubscribe: (() => void) | undefined;
    let previous = -1;
    const start = () => {
      if (!visible || !atlas || unsubscribe || disposed) return;
      unsubscribe = subscribeFramePainter((time, reduced) => {
        const canvas = ref.current;
        if (!canvas || !atlas) return;
        const index = frameAtTime(time, atlas.frames, atlas.fps, reduced);
        if (index === previous) return;
        paintEffectIcon(canvas, atlas, index, size);
        previous = index;
      });
    };
    const show = (next: boolean) => {
      visible = next;
      if (!visible) { unsubscribe?.(); unsubscribe = undefined; previous = -1; return; }
      if (!requested) {
        requested = true;
        void loadFrameAtlas(effect.type, role).then(value => { if (!disposed) { atlas = value; start(); } })
          .catch(error => console.error("Could not load effect icon", error));
      } else start();
    };
    const observer = new IntersectionObserver(entries => show(entries.some(entry => entry.isIntersecting)), { rootMargin: "60px" });
    if (ref.current) observer.observe(ref.current);
    return () => { disposed = true; observer.disconnect(); unsubscribe?.(); };
  }, [identity, effect.type, role, size]);
  return <canvas ref={ref} aria-hidden="true" className="shrink-0" style={{ width: size, height: size }} />;
}
