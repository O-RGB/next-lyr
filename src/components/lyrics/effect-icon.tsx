"use client";

import { useEffect, useRef } from "react";
import { frameAtTime } from "@/lib/block-effects/catalog";
import { subscribeFramePainter } from "@/lib/block-effects/animation";
import { loadFrameAtlas, frameAtlasIdentity } from "@/lib/block-effects/frames";
import { paintEffectIcon } from "@/lib/block-effects/icon";
import { effectIconRole, type BlockEffect } from "@/lib/block-effects/types";

export function EffectIcon({ effect, size = 20 }: { effect: BlockEffect; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const role = effectIconRole(effect), identity = frameAtlasIdentity(effect.type, role);
  useEffect(() => {
    let disposed = false, unsubscribe: (() => void) | undefined;
    let previous = -1;
    void loadFrameAtlas(effect.type, role).then(atlas => {
      if (disposed) return;
      unsubscribe = subscribeFramePainter((time, reduced) => {
        const canvas = ref.current;
        if (!canvas) return;
        const box = canvas.getBoundingClientRect();
        if (!box.width || box.bottom < 0 || box.top > innerHeight) return;
        const index = frameAtTime(time, atlas.frames, atlas.fps, reduced);
        if (index === previous) return;
        paintEffectIcon(canvas, atlas, index, size);
        previous = index;
      });
    }).catch(error => console.error("Could not load effect icon", error));
    return () => { disposed = true; unsubscribe?.(); };
  }, [identity, effect.type, role, size]);
  return <canvas ref={ref} aria-hidden="true" className="shrink-0" style={{ width: size, height: size }} />;
}
