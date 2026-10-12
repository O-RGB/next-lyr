"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createProject, getProject, db, projectSummaries, nextProjectRevision, putStickerAsset, type ProjectData } from "@/lib/database/db";
import { updateArrangementSubtitles, updateOggPromotion, updateArrangementEmoji } from "./subtitle-update";
import { wordDataToLyricsDocument } from "@/lib/karaoke/lyrics-core/timeline";
import { buildKlyrXml } from "@/lib/karaoke/lyrics-core/xml";
import { parseMidi } from "@/lib/karaoke/midi/reader";
import { groupLyricsByLine } from "@/lib/karaoke/lyrics/convert";
import { DEFAULT_SONG_INFO } from "@/lib/karaoke/midi/types";
import { DEFAULT_SOUNDFONT_ENTRY, DEFAULT_SOUNDFONT_ID } from "@/lib/soundfonts";
import { convertParsedDataForImport } from "@/stores/karaoke-store/utils";

const FILE_URL = "/arrangements/dragonforce/DT0001-retimed-solo-show.mid";
const PROJECT_KEY = "arrangement:dragonforce:retimed-solo-show:v2";
const REVISION_KEY = `${PROJECT_KEY}:revision`;
const REVISION = "ogg-and-text-emoji-v6";
let pendingImport: Promise<string> | undefined;

async function importArrangement(): Promise<string> {
  const existingId = localStorage.getItem(PROJECT_KEY);
  const existing = existingId ? await getProject(existingId) : undefined;
  if (existing && localStorage.getItem(REVISION_KEY) === REVISION) return existing.id;

  const response = await fetch(FILE_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("โหลดไฟล์เพลงไม่สำเร็จ");
  const file = new File([await response.blob()], "DT0001-retimed-solo-show.mid", {
    type: "audio/midi",
  });
  const midi = await parseMidi(file);
  const imported = convertParsedDataForImport(midi, true, midi.ticksPerBeat, midi.tempos);
  const data: ProjectData = {
    playerState: { midi, storedFile: null, duration: midi.duration, youtubeId: null },
    metadata: { ...DEFAULT_SONG_INFO, ...midi.info },
    lyricsData: groupLyricsByLine(imported.finalWords),
    lyricsDocument: imported.lyricsDocument,
    lyricsXml: imported.lyricsXml,
    chordsData: imported.convertedChords,
    soundfonts: [DEFAULT_SOUNDFONT_ENTRY],
    activeSoundfontId: DEFAULT_SOUNDFONT_ID,
  };
  if (existing) {
    const subtitles = updateArrangementSubtitles(existing.data.lyricsData, data.lyricsData);
    const promotion = updateOggPromotion(subtitles.lyricsData, data.lyricsData);
    const emoji = updateArrangementEmoji(promotion.lyricsData, data.lyricsData);
    const lyricsData = emoji.lyricsData;
    if (subtitles.updated || promotion.updated || emoji.updated) {
      const used = new Set(lyricsData.flat().filter(word => word.kind === "image").map(word => word.sticker?.id));
      for (const asset of data.lyricsDocument?.assets ?? []) {
        if (!used.has(asset.sticker.id)) continue;
        const bytes = Uint8Array.from(atob(asset.base64), char => char.charCodeAt(0));
        const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
        const id = [...digest].map(value => value.toString(16).padStart(2, "0")).join("");
        if (id !== asset.sticker.id) throw new Error("invalid-sticker-hash");
        await putStickerAsset(existing.id, asset.sticker, new Blob([bytes], { type: asset.sticker.mime }));
      }
      const lyricsDocument = { ...existing.data.lyricsDocument, ...wordDataToLyricsDocument({
        lyricsData, source: "KMID", timeBase: existing.data.lyricsDocument?.timeBase ?? { kind: "midi-tick", ppq: midi.ticksPerBeat },
        info: existing.data.metadata ?? data.metadata ?? DEFAULT_SONG_INFO,
      }) };
      const nextData = { ...existing.data, lyricsData, lyricsDocument, lyricsXml: buildKlyrXml(lyricsDocument) };
      const updatedAt = nextProjectRevision();
      await db.transaction("rw", db.projects, projectSummaries, async () => {
        await db.projects.update(existing.id, { data: nextData, updatedAt });
        await projectSummaries.update(existing.id, { updatedAt });
      });
    }
    localStorage.setItem(REVISION_KEY, REVISION);
    return existing.id;
  }
  const id = await createProject("Through the Fire and Flames — Retimed Solo Show", "midi", data, file);
  localStorage.setItem(PROJECT_KEY, id);
  localStorage.setItem(REVISION_KEY, REVISION);
  return id;
}

// Share one import across Strict Mode mounts; revisits check the saved project.
function ensureProject(): Promise<string> {
  return pendingImport ??= importArrangement().finally(() => { pendingImport = undefined; });
}

export default function DragonforceArrangementPage() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    ensureProject().then(id => {
      if (active) router.replace(`/project/${id}`);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "สร้างโปรเจกต์ไม่สำเร็จ");
    });
    return () => { active = false; };
  }, [router, attempt]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-lg font-semibold">Through the Fire and Flames</p>
        <p role="status" className="text-sm text-muted-foreground">
          {error ?? "กำลังเปิดโปรเจกต์ที่จัดเนื้อร้องและ timing ใหม่…"}
        </p>
        {error && <Button onClick={() => { setError(undefined); setAttempt(value => value + 1); }}>ลองอีกครั้ง</Button>}
        <a className="block text-sm underline" href={FILE_URL} download>ดาวน์โหลดไฟล์ MIDI สำหรับเล่น</a>
      </div>
    </main>
  );
}
