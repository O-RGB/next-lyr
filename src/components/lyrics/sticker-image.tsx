"use client";

import { useEffect, useState } from "react";
import { getStickerBlob } from "@/lib/database/db";
import type { LyricSticker } from "@/lib/stickers/types";

export function StickerImage({ projectId, sticker, size = 32 }: {
  projectId: string;
  sticker: LyricSticker;
  size?: number;
}) {
  const [source, setSource] = useState<{ key: string; url: string } | null>(null);
  const key = `${projectId}:${sticker.id}`;
  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    void getStickerBlob(projectId, sticker.id).then((blob) => {
      if (cancelled || !blob) return;
      url = URL.createObjectURL(blob);
      setSource({ key, url });
    }).catch((error) => console.error("Could not load sticker:", error));
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [key, projectId, sticker.id]);
  if (!source || source.key !== key) return null;
  // These are local Blob URLs, which Next's remote image optimizer cannot read.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={source.url} alt={sticker.name} width={size} height={size}
    loading="lazy" decoding="async" className="shrink-0 object-contain" style={{ width: size, height: size }} draggable={false} />;
}
