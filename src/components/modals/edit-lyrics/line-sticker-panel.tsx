"use client";

import { useEffect, useRef, useState } from "react";
import { ImageGalleryPanel } from "@/components/common/image-gallery-panel";
import { StickerImage } from "@/components/lyrics/sticker-image";
import { getGalleryImages, removeGalleryImage } from "@/lib/database/db";
import { importGalleryImage } from "@/lib/stickers/gallery";
import type { LyricSticker, GalleryImage } from "lyrio/media";
import { useUiStore } from "@/features/ui/ui-store";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";

export default function LineStickerPanel({ projectId, replacing = false, onChange, onBusyChange }: {
  projectId: string;
  replacing?: boolean;
  onChange: (value: LyricSticker | null) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const locale = useSettingsStore((state) => state.uiLocale);
  const requestConfirm = useUiStore((state) => state.requestConfirm);
  const deletionRef = useRef(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<GalleryImage[]>([]);
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
    if (!files.length || busy || deletionRef.current) return;
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

  const removeImage = async (image: GalleryImage) => {
    if (busy || deletionRef.current) return;
    deletionRef.current = true;
    setDeletingId(image.id);
    setError(null);
    try {
      const confirmed = await requestConfirm({
        title: text(locale, "ลบรูปจากคลังภาพ?", "Remove image from gallery?"),
        description: text(locale,
          `ลบ “${image.sticker.name}” ออกจากคลังภาพ รูปที่ใส่ในเนื้อร้องแล้วจะยังอยู่ตามเดิม`,
          `Remove “${image.sticker.name}” from the gallery. Images already placed in lyrics will stay unchanged.`),
        tone: "danger",
        confirmLabel: text(locale, "ลบจากคลังภาพ", "Remove from gallery"),
      });
      if (!confirmed) return;
      setBusy(true);
      onBusyChange(true);
      await removeGalleryImage(image.id);
      setImages((current) => current.filter((item) => item.id !== image.id));
    } catch {
      setError(text(locale, "ลบรูปจากคลังภาพไม่สำเร็จ กรุณาลองใหม่", "Could not remove the image from the gallery. Please try again."));
    } finally {
      deletionRef.current = false;
      setDeletingId(null);
      setBusy(false);
      onBusyChange(false);
    }
  };

  return <ImageGalleryPanel
    items={images.map(image=>({...image,name:image.sticker.name,bytes:image.sticker.bytes}))}
    title={text(locale,"คลังสติกเกอร์ · ใช้ร่วมกันทุกโปรเจกต์","Sticker gallery · shared across projects")}
    description={text(locale,"GIF, PNG, JPG ไม่เกิน 1 MB · ภาพนิ่งแปลงเป็น WebP และบีบอัดอัตโนมัติ","GIF, PNG, JPG up to 1 MB · still images converted to compressed WebP")}
    selectionHint={text(locale,replacing?"แตะภาพเพื่อแทนรูปเดิม เวลาและเอฟเฟกต์อยู่เหมือนเดิม":"แตะภาพเพื่อเพิ่มในเนื้อร้อง",replacing?"Tap to replace this image, keeping its timing and effect":"Tap an image to add it to the lyrics")}
    accept="image/gif,image/png,image/jpeg,.gif,.png,.jpg,.jpeg"
    uploadLabel={text(locale,"อัปโหลดสติกเกอร์","Upload sticker")}
    busy={busy} deletingId={deletingId} error={error} notice={notice}
    renderPreview={image=><StickerImage projectId={projectId} sticker={image.sticker} size={40}/>}
    onUpload={files=>void upload(files)} onSelect={image=>onChange(image.sticker)} onRemove={image=>void removeImage(image)}
  />;
}
