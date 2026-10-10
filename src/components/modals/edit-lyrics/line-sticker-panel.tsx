"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ButtonCommon from "@/components/common/button";
import { StickerImage } from "@/components/lyrics/sticker-image";
import { getGalleryImages } from "@/lib/database/db";
import { importGalleryImage } from "@/lib/stickers/gallery";
import type { LyricSticker, GalleryImage } from "@/lib/stickers/types";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";

export default function LineStickerPanel({ projectId, replacing = false, onChange, onBusyChange }: {
  projectId: string;
  replacing?: boolean;
  onChange: (value: LyricSticker | null) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const locale = useSettingsStore((state) => state.uiLocale);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = () => { void getGalleryImages().then((items) => { if (active) setImages(items); }).catch(() => { if (active) setError(text(locale, "เปิดคลังภาพไม่สำเร็จ", "Could not open gallery")); }); };
    refresh();
    window.addEventListener("next-lyr-gallery-changed", refresh);
    return () => { active = false; window.removeEventListener("next-lyr-gallery-changed", refresh); };
  }, [locale]);
  const busyCallback = useRef(onBusyChange);
  useEffect(() => { busyCallback.current = onBusyChange; }, [onBusyChange]);
  useEffect(() => () => { requestRef.current?.abort(); busyCallback.current(false); }, []);

  const upload = async (files: File[]) => {
    if (!files.length || busy) return;
    requestRef.current?.abort();
    const request = new AbortController();
    requestRef.current = request;
    setError(null); setNotice(null); setBusy(true); onBusyChange(true);
    try {
      const result = await importGalleryImage(projectId, files[0], request.signal);
      if (result.reused) setNotice(text(locale, "ใช้ภาพเดิมจากคลัง ไม่เก็บไฟล์ซ้ำ", "Reused gallery image; no duplicate file stored"));
      onChange(result.sticker);
    } catch (cause) {
      if (request.signal.aborted) return;
      const code = cause instanceof Error ? cause.message : "invalid-image";
      const errors: Record<string, [string, string]> = {
        "file-too-large": ["ไฟล์ต้องไม่เกิน 1 MB", "Files must be 1 MB or smaller"],
        "unsupported-image": ["รองรับ GIF, PNG และ JPG เท่านั้น", "Only GIF, PNG, and JPG are supported"],
        "image-too-large": ["ภาพมีขนาดพิกเซลใหญ่เกินไป กรุณาเลือกรูปที่เล็กลง", "Too many pixels; choose a smaller image"],
        "gif-too-complex": ["GIF มีเฟรมมากเกินไป กรุณาเลือก GIF ที่สั้นหรือเล็กลง", "Choose a shorter or smaller GIF"],
        "use-gif-for-animation": ["ภาพ PNG เคลื่อนไหวยังไม่รองรับ กรุณาใช้ GIF", "Use GIF for animated stickers"],
        "optimized-image-too-large": ["ย่อแล้วภาพยังใหญ่เกินไป กรุณาเลือกภาพที่เล็กลง", "The optimized image is still too large; choose a smaller one"],
        "gif-optimize-failed": ["ปรับขนาด GIF ไม่สำเร็จ กรุณาลองไฟล์อื่น", "Could not optimize this GIF; try another file"],
      };
      setError(text(locale, ...(errors[code] ?? ["อ่านหรือบันทึกภาพไม่สำเร็จ กรุณาลองใหม่", "Could not read or save the image; please try again"])));
    } finally {
      if (requestRef.current === request && !request.signal.aborted) { setBusy(false); onBusyChange(false); }
    }
  };

  const filtered = images.filter((image) => image.sticker.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const bytes = images.reduce((sum, image) => sum + image.sticker.bytes, 0);
  return (
    <section className="rounded-xl border border-line bg-panel p-3 shadow-sm"
      onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }}
      onDrop={(event) => { if (!event.dataTransfer.files.length) return; event.preventDefault(); void upload(Array.from(event.dataTransfer.files)); }}>
      <div className="flex flex-wrap items-center gap-3">
        <ImagePlus className="size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-semibold">{text(locale, "คลังสติกเกอร์ · ใช้ร่วมกันทุกโปรเจกต์", "Sticker gallery · shared across projects")}</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">{images.length} {text(locale, "ภาพ", "images")} · {Math.ceil(bytes / 1000)} KB</p>
        </div>
        <ButtonCommon type="button" size="xs" variant="outline" disabled={busy}
          icon={busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} onClick={() => inputRef.current?.click()}>
          {text(locale, "อัปโหลด", "Upload")}
        </ButtonCommon>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{text(locale, "GIF, PNG, JPG ไม่เกิน 1 MB · ย่อให้โดยอัตโนมัติ", "GIF, PNG, JPG up to 1 MB · optimized automatically")}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{text(locale,
        replacing ? "แตะภาพเพื่อแทนรูปเดิม เวลาและเอฟเฟกต์อยู่เหมือนเดิม" : "แตะภาพเพื่อเพิ่มในเนื้อร้อง",
        replacing ? "Tap to replace this image, keeping its timing and effect" : "Tap an image to add it to the lyrics")}</p>
      <input ref={inputRef} type="file" accept="image/gif,image/png,image/jpeg,.gif,.png,.jpg,.jpeg" className="hidden"
        aria-label={text(locale, "อัปโหลดสติกเกอร์", "Upload sticker")}
        onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void upload(files); }} />
      {images.length > 0 && <>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
          aria-label={text(locale, "ค้นหาในคลังภาพ", "Search gallery")} placeholder={text(locale, "ค้นหาชื่อภาพ", "Search image names")}
          className="mt-2 w-full rounded-md border border-line bg-base px-2 py-1 text-xs" />
        <div className="mt-2 grid max-h-44 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
          {filtered.map(({ id, sticker }) => <button key={id} type="button" disabled={busy}
            onClick={() => onChange(sticker)} aria-label={text(locale, `ใช้ภาพ ${sticker.name}`, `Use image ${sticker.name}`)}
            className="flex min-w-0 flex-col items-center gap-1 rounded-lg border border-line bg-base p-2 hover:bg-panel-2 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">
            <StickerImage projectId={projectId} sticker={sticker} size={40} />
            <span className="w-full truncate text-[10px]" title={sticker.name}>{sticker.name}</span>
            <span className="text-[10px] text-muted-foreground">{Math.ceil(sticker.bytes / 1000)} KB</span>
          </button>)}
        </div>
        {!filtered.length && <p className="mt-2 text-xs text-muted-foreground">{text(locale, "ไม่พบภาพ", "No matching images")}</p>}
      </>}
      {busy && <p role="status" className="mt-2 text-[11px] text-muted-foreground">{text(locale, "กำลังย่อและเก็บภาพในเครื่อง…", "Optimizing and saving on your device…")}</p>}
      {notice && <p role="status" className="mt-2 text-[11px] text-muted-foreground">{notice}</p>}
      {error && <p role="alert" className="mt-2 text-[11px] text-destructive">{error}</p>}
    </section>
  );
}
