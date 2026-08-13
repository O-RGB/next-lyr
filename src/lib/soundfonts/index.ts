import { DEFAULT_SOUND_FONT } from "@/configs/value";
import { db } from "@/lib/database/db";
import { generateUUID } from "@/lib/uuid";
import type { SoundfontEntry } from "./types";

export type { SoundfontEntry } from "./types";

export const MAX_SOUNDFONT_BYTES = 500 * 1024 * 1024;
export const SOUNDFONT_CHUNK_BYTES = 8 * 1024 * 1024;
export const DEFAULT_SOUNDFONT_ID = "bundled-default";
export const DEFAULT_SOUNDFONT_FILE_NAME = "default-sound-font.sf2";
// Keep existing projects on the same lightweight default as NKML Studio.
// A byte-size mismatch means an older bundled default is cached in IndexedDB.
const DEFAULT_SOUNDFONT_BYTES = 414_332;

export const DEFAULT_SOUNDFONT_ENTRY: SoundfontEntry = {
  id: DEFAULT_SOUNDFONT_ID,
  fileName: DEFAULT_SOUNDFONT_FILE_NAME,
};

const defaultSoundfontPromises = new Map<string, Promise<Blob>>();

export function isSoundfontFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".sf2") ||
    file.type.toLowerCase().includes("soundfont");
}

async function deleteStoredSoundfont(
  projectId: string,
  soundfontId: string
): Promise<void> {
  await db.soundfontBlobs
    .where("projectId")
    .equals(projectId)
    .filter((record) => record.soundfontId === soundfontId)
    .delete();
}

async function storeSoundfontBlob(
  projectId: string,
  soundfontId: string,
  blob: Blob
): Promise<void> {
  if (blob.size > MAX_SOUNDFONT_BYTES) {
    throw new Error("SoundFont files must be 500 MB or smaller");
  }

  await db.transaction("rw", db.soundfontBlobs, async () => {
    await deleteStoredSoundfont(projectId, soundfontId);

    const chunks = [];
    for (let offset = 0, chunkIndex = 0; offset < blob.size; offset += SOUNDFONT_CHUNK_BYTES, chunkIndex += 1) {
      chunks.push({
        key: `${projectId}:${soundfontId}:${chunkIndex}`,
        projectId,
        soundfontId,
        chunkIndex,
        blob: blob.slice(offset, offset + SOUNDFONT_CHUNK_BYTES, blob.type || "audio/sf2"),
        bytes: blob.size,
      });
    }

    if (chunks.length > 0) {
      await db.soundfontBlobs.bulkPut(chunks);
    }
  });
}

async function readStoredSoundfont(
  projectId: string,
  soundfontId: string
): Promise<Blob | undefined> {
  const records = await db.soundfontBlobs
    .where("projectId")
    .equals(projectId)
    .filter((record) => record.soundfontId === soundfontId)
    .toArray();

  if (records.length === 0) return undefined;
  records.sort((left, right) => left.chunkIndex - right.chunkIndex);
  return new Blob(
    records.map((record) => record.blob),
    { type: records[0]?.blob.type || "audio/sf2" }
  );
}

async function ensureDefaultSoundfont(projectId: string): Promise<Blob> {
  const existing = await readStoredSoundfont(projectId, DEFAULT_SOUNDFONT_ID);
  if (existing?.size === DEFAULT_SOUNDFONT_BYTES) return existing;

  const pending = defaultSoundfontPromises.get(projectId);
  if (pending) return pending;

  const promise = fetch(DEFAULT_SOUND_FONT)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Could not load the default SoundFont (${response.status})`);
      }
      const blob = await response.blob();
      await storeSoundfontBlob(projectId, DEFAULT_SOUNDFONT_ID, blob);
      return blob;
    })
    .finally(() => {
      defaultSoundfontPromises.delete(projectId);
    });

  defaultSoundfontPromises.set(projectId, promise);
  return promise;
}

export async function importSoundfontFile(
  file: File,
  projectId: string,
  replaceId?: string
): Promise<SoundfontEntry> {
  if (!isSoundfontFile(file)) {
    throw new Error("กรุณาเลือกไฟล์ SoundFont นามสกุล .sf2");
  }
  if (file.size <= 0) {
    throw new Error("ไฟล์ SoundFont ว่างเปล่า");
  }
  if (file.size > MAX_SOUNDFONT_BYTES) {
    throw new Error("ไฟล์ SoundFont ต้องมีขนาดไม่เกิน 500 MB");
  }
  if (replaceId === DEFAULT_SOUNDFONT_ID) {
    throw new Error("ไม่สามารถแทนที่ SoundFont เริ่มต้นได้");
  }

  const id = replaceId ?? generateUUID();
  await storeSoundfontBlob(projectId, id, file);

  return {
    id,
    fileName: file.name,
    bytes: file.size,
    revision: generateUUID(),
  };
}

export async function removeSoundfontFile(
  projectId: string,
  soundfontId: string
): Promise<void> {
  if (soundfontId === DEFAULT_SOUNDFONT_ID) return;
  await deleteStoredSoundfont(projectId, soundfontId);
}

export async function readSoundfontBlob(
  projectId: string,
  soundfontId = DEFAULT_SOUNDFONT_ID
): Promise<Blob | undefined> {
  if (soundfontId === DEFAULT_SOUNDFONT_ID) {
    return ensureDefaultSoundfont(projectId);
  }
  return readStoredSoundfont(projectId, soundfontId);
}

export function normalizeSoundfontLibrary(data: {
  soundfonts?: SoundfontEntry[];
  activeSoundfontId?: string;
}): { soundfonts: SoundfontEntry[]; activeSoundfontId: string } {
  const customEntries = (data.soundfonts ?? []).filter(
    (entry) => entry.id !== DEFAULT_SOUNDFONT_ID && entry.fileName
  );
  const soundfonts = [DEFAULT_SOUNDFONT_ENTRY, ...customEntries];
  const activeSoundfontId = soundfonts.some(
    (entry) => entry.id === data.activeSoundfontId
  )
    ? data.activeSoundfontId!
    : DEFAULT_SOUNDFONT_ID;

  return { soundfonts, activeSoundfontId };
}

export function formatSoundfontBytes(bytes?: number): string {
  if (!bytes || bytes < 1) return "ขนาดไม่ทราบ";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
