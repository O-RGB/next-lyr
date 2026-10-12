"use client";

import { useState } from "react";
import { ImagePlus, Plus, Type } from "lucide-react";
import ButtonCommon from "@/components/common/button";
import VisibleSpaceInput from "@/components/common/data-input/visible-space-input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import type { LyricSticker } from "@next-karaoke/lyrics/media";
import { EditorDrawer } from "./editor-drawer";
import LineStickerPanel from "./line-sticker-panel";

export function LyricContentDrawer({ open, replacing, projectId, onClose, onWord, onImage, onBusyChange }: {
  open: boolean; replacing: boolean; projectId: string | null; onClose: () => void;
  onWord: (word: string, vocal: string) => void; onImage: (sticker: LyricSticker) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const locale = useSettingsStore(state => state.uiLocale);
  const [word, setWord] = useState(""), [vocal, setVocal] = useState("");
  const gallery = open && projectId ? <LineStickerPanel projectId={projectId} replacing={replacing}
    onChange={sticker => { if (sticker) onImage(sticker); }} onBusyChange={onBusyChange} /> : null;
  return <EditorDrawer open={open} onClose={onClose}
    title={text(locale, replacing ? "เปลี่ยนรูป" : "เพิ่มคำหรือรูป", replacing ? "Replace image" : "Add word or image")}
    description={text(locale, replacing ? "เลือกรูปจากคลังหรืออัปโหลดเพื่อแทนรูปนี้" : "เพิ่มหลังรายการที่เลือก แล้วลากจัดตำแหน่งต่อได้",
      replacing ? "Choose a gallery image or upload a replacement" : "Insert after the focused item, then drag to reorder")}>
    {replacing ? gallery : <Tabs defaultValue="word">
      <TabsList className="mb-2 w-full">
        <TabsTrigger value="word"><Type />{text(locale, "คำร้อง", "Word")}</TabsTrigger>
        <TabsTrigger value="image"><ImagePlus />{text(locale, "รูป / GIF", "Image / GIF")}</TabsTrigger>
      </TabsList>
      <TabsContent value="word">
        <form className="space-y-3" onSubmit={event => {
          event.preventDefault();
          if (word.length === 0) return;
          onWord(word, vocal); setWord(""); setVocal("");
        }}>
          <VisibleSpaceInput label={text(locale, "คำร้อง", "Lyrics")} aria-label={text(locale, "คำร้องใหม่", "New word")}
            value={word} onChange={event => setWord(event.target.value)} />
          <VisibleSpaceInput label={text(locale, "ซับ (ถ้ามี)", "Subtitle (optional)")} aria-label={text(locale, "ซับของคำใหม่", "New word subtitle")}
            value={vocal} onChange={event => setVocal(event.target.value)} />
          <ButtonCommon type="submit" className="w-full" icon={<Plus />} disabled={word.length === 0}>{text(locale, "เพิ่มคำ", "Add word")}</ButtonCommon>
        </form>
      </TabsContent>
      <TabsContent value="image">{gallery}</TabsContent>
    </Tabs>}
  </EditorDrawer>;
}
