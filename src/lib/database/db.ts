import type { LineStickers, LyricSticker, GalleryImage } from "../stickers/types";
import Dexie, { Table } from "dexie";
import { MusicMode, IMidiInfo } from "@/types/common.type";
import { generateUUID } from "@/lib/uuid";
import { KaraokeState } from "@/stores/karaoke-store/types";
import { createStoredFileFromFile } from "@/stores/karaoke-store/utils";
import { IMidiParseResult } from "../karaoke/midi/types";
import { buildKlyrXml } from "../karaoke/lyrics-core/xml";
import type { LyricsDocument } from "../karaoke/lyrics-core/types";
import type { SoundfontEntry } from "../soundfonts/types";

export interface StoredFile {
  file: File;
  buffer: ArrayBuffer;
  name: string;
  type: string;
}

export interface PlayerState {
  midi: IMidiParseResult | null;
  storedFile: StoredFile | null;
  duration: number | null;
  youtubeId: string | null;
}

export interface ProjectData {
  playerState: PlayerState;
  lyricsData: KaraokeState["lyricsData"];
  lineStickers?: LineStickers;
  lyricsDocument?: LyricsDocument | null;
  lyricsXml?: string;
  chordsData: KaraokeState["chordsData"];
  metadata: KaraokeState["metadata"];
  soundfonts?: SoundfontEntry[];
  activeSoundfontId?: string;
}

export interface TimingDraft {
  projectId: string;
  lyricsData: ProjectData["lyricsData"];
  lineStickers?: LineStickers;
  lyricsDocument: LyricsDocument | null;
  lyricsXml: string;
  updatedAt: Date;
}

export interface SoundfontBlobRecord {
  key: string;
  projectId: string;
  soundfontId: string;
  chunkIndex: number;
  blob: Blob;
  bytes: number;
}

export interface EditorFontRecord {
  id: string;
  name: string;
  family: string;
  type: string;
  bytes: number;
  buffer: ArrayBuffer;
  createdAt: Date;
}

export interface Project {
  id: string;
  name: string;
  mode: MusicMode;
  data: ProjectData;
  createdAt: Date;
  updatedAt: Date;
}

/** Lightweight record used by the project picker.
 *
 * Project.data can contain the complete song file and parsed MIDI buffers. Do
 * not read that payload just to render a list of project names.
 */
export interface ProjectSummary {
  id: string;
  name: string;
  mode: MusicMode;
  createdAt: Date;
  updatedAt: Date;
}

export class MySubClassedDexie extends Dexie {
  projects!: Table<Project>;
  timingDrafts!: Table<TimingDraft>;
  stickerAssets!: Table<{ key: string; projectId: string; blob: Blob }>;
  galleryAssets!: Table<{ id: string; blob: Blob }>;
  galleryImages!: Table<GalleryImage>;
  soundfontBlobs!: Table<SoundfontBlobRecord>;
  editorFonts!: Table<EditorFontRecord>;

  constructor() {
    super("karaokeProjectDB");

    this.version(6).stores({
      projects: "&id, name, createdAt, updatedAt",
    });
    this.version(7).stores({
      projects: "&id, name, createdAt, updatedAt",
      soundfontBlobs: "&key, projectId, [projectId+soundfontId]",
    });
    this.version(8).stores({
      projects: "&id, name, createdAt, updatedAt",
      soundfontBlobs: "&key, projectId, [projectId+soundfontId]",
      editorFonts: "&id, name, createdAt",
    });
    this.version(9).stores({
      projects: "&id, name, createdAt, updatedAt",
      soundfontBlobs: "&key, projectId, [projectId+soundfontId]",
      editorFonts: "&id, name, createdAt",
      projectSummaries: "&id, name, createdAt, updatedAt",
    });
    this.version(10).stores({
      projects: "&id, name, createdAt, updatedAt",
      soundfontBlobs: "&key, projectId, [projectId+soundfontId]",
      editorFonts: "&id, name, createdAt",
      projectSummaries: "&id, name, createdAt, updatedAt",
      timingDrafts: "&projectId, updatedAt",
    });
    this.version(11).stores({
      projects: "&id, name, createdAt, updatedAt",
      soundfontBlobs: "&key, projectId, [projectId+soundfontId]",
      editorFonts: "&id, name, createdAt",
      projectSummaries: "&id, name, createdAt, updatedAt",
      timingDrafts: "&projectId, updatedAt",
      stickerAssets: "&key, projectId",
    });
    this.version(12).stores({
      projects: "&id, name, createdAt, updatedAt",
      soundfontBlobs: "&key, projectId, [projectId+soundfontId]",
      editorFonts: "&id, name, createdAt",
      projectSummaries: "&id, name, createdAt, updatedAt",
      timingDrafts: "&projectId, updatedAt",
      stickerAssets: "&key, projectId",
      galleryAssets: "&id",
      galleryImages: "&id, createdAt",
    }).upgrade(async (tx) => {
      const legacy = await tx.table("stickerAssets").toArray();
      for (const record of legacy) {
        const id = record.key.slice(record.projectId.length + 1);
        if (await tx.table("galleryAssets").get(id)) continue;
        const project = await tx.table("projects").get(record.projectId);
        const stickers = [...Object.values(project?.data.lineStickers ?? {}) as LyricSticker[],
          ...(project?.data.lyricsDocument?.lines.flat() ?? []).flatMap((word: { sticker?: LyricSticker }) => word.sticker ? [word.sticker] : [])];
        const sticker = stickers.find((item) => item.id === id) ?? {
          id, name: `image-${id.slice(0, 8)}.${record.blob.type.split("/")[1] || "png"}`, mime: record.blob.type,
          width: 256, height: 256, bytes: record.blob.size, originalBytes: record.blob.size, position: "before",
        };
        await tx.table("galleryAssets").put({ id, blob: record.blob });
        await tx.table("galleryImages").put({ id, sticker, sourceHashes: [], createdAt: new Date() });
      }
      await tx.table("stickerAssets").clear();
    });
  }
}

let lastRevision = 0;
export const nextProjectRevision = () => {
  lastRevision = Math.max(Date.now(), lastRevision + 1);
  return new Date(lastRevision);
};

export const db = new MySubClassedDexie();
export const projectSummaries = db.table<ProjectSummary>("projectSummaries");

export const createProject = async (
  name: string,
  mode: MusicMode,
  initialData: ProjectData,
  musicFile?: File
): Promise<string> => {
  try {
    if (musicFile) {
      initialData.playerState.storedFile = await createStoredFileFromFile(
        musicFile
      );
    }

    // Playback imports are new projects, never project archives. Move their
    // embedded images into the shared gallery and keep only references here.
    if (initialData.lyricsDocument?.assets?.length) {
      const document = initialData.lyricsDocument;
      const used = new Set(document.lines.flat().filter((word) => word.kind === "image").map((word) => word.sticker?.id));
      for (const asset of document.assets ?? []) {
        if (!used.has(asset.sticker.id)) continue;
        const bytes = Uint8Array.from(atob(asset.base64), (char) => char.charCodeAt(0));
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        const id = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
        if (id !== asset.sticker.id) throw new Error("invalid-sticker-hash");
        await putStickerAsset("", { ...asset.sticker, bytes: bytes.length }, new Blob([bytes], { type: asset.sticker.mime }));
      }
      initialData.lyricsDocument = { ...document, assets: undefined };
      initialData.lyricsXml = buildKlyrXml(initialData.lyricsDocument);
    }
    const newProject: Project = {
      id: generateUUID(),
      name,
      mode,
      data: initialData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.transaction("rw", db.projects, projectSummaries, async () => {
      await db.projects.add(newProject);
      await projectSummaries.add({
        id: newProject.id,
        name: newProject.name,
        mode: newProject.mode,
        createdAt: newProject.createdAt,
        updatedAt: newProject.updatedAt,
      });
    });
    return newProject.id;
  } catch (error) {
    console.error("Failed to create project:", error);
    throw error;
  }
};

export const getAllProjects = async (): Promise<Project[]> => {
  return await db.projects.orderBy("createdAt").reverse().toArray();
};

export const getAllProjectSummaries = async (): Promise<ProjectSummary[]> => {
  return await projectSummaries.orderBy("createdAt").reverse().toArray();
};

export const upsertProjectSummary = async (
  summary: ProjectSummary
): Promise<void> => {
  await projectSummaries.put(summary);
};

export const getProject = async (id: string): Promise<Project | undefined> => {
  return await db.transaction("r", db.projects, db.timingDrafts, async () => {
    const project = await db.projects.get(id);
    if (!project) return undefined;
    const draft = await db.timingDrafts.get(id);
    if (!draft || draft.updatedAt <= project.updatedAt) return project;
    return { ...project, data: { ...project.data,
      lyricsData: draft.lyricsData,
      lineStickers: draft.lineStickers ?? project.data.lineStickers ?? {},
      lyricsDocument: draft.lyricsDocument,
      lyricsXml: draft.lyricsXml,
    } };
  });
};

export const updateProject = async (
  id: string,
  data: ProjectData
): Promise<void> => {
  try {
    const updatedAt = nextProjectRevision();
    await db.transaction("rw", db.projects, db.timingDrafts, async () => {
      await db.projects.update(id, { data, updatedAt });
      const draft = await db.timingDrafts.get(id);
      // A later stamp can be saved while this full project write is in flight.
      if (draft && draft.updatedAt <= updatedAt) await db.timingDrafts.delete(id);
    });

    // Keep the lightweight picker entry current without touching the large
    // project payload during list rendering.
    const summary = await projectSummaries.get(id);
    if (summary) {
      await projectSummaries.update(id, {
        name: data.metadata?.TITLE || summary.name,
        updatedAt,
      });
    }
  } catch (error) {
    console.error(`Failed to update project ${id}:`, error);
    throw error;
  }
};

export const deleteProject = async (id: string): Promise<void> => {
  try {
    await db.transaction(
      "rw",
      [db.projects, db.soundfontBlobs, db.timingDrafts, db.stickerAssets, projectSummaries],
      async () => {
        await db.projects.delete(id);
        await db.timingDrafts.delete(id);
        await db.stickerAssets.where("projectId").equals(id).delete();
        await db.soundfontBlobs.where("projectId").equals(id).delete();
        await projectSummaries.delete(id);
      }
    );
  } catch (error) {
    console.error(`Failed to delete project ${id}:`, error);
    throw error;
  }
};

export const deleteAllProjects = async (): Promise<void> => {
  try {
    await db.transaction(
      "rw",
      [db.projects, db.soundfontBlobs, db.timingDrafts, db.stickerAssets, projectSummaries],
      async () => {
        await db.projects.clear();
        await db.timingDrafts.clear();
        await db.stickerAssets.clear();
        await db.soundfontBlobs.clear();
        await projectSummaries.clear();
      }
    );
    console.log("All projects have been deleted.");
  } catch (error) {
    console.error("Failed to delete all projects:", error);
    throw error;
  }
};

/** Drafts omit media buffers, so frequent recovery writes stay small. */
export const saveTimingDraft = async (draft: TimingDraft): Promise<void> => {
  await db.transaction("rw", projectSummaries, db.timingDrafts, async () => {
    const project = await projectSummaries.get(draft.projectId);
    if (!project || project.updatedAt >= draft.updatedAt) return;
    const current = await db.timingDrafts.get(draft.projectId);
    if (current && current.updatedAt > draft.updatedAt) return;
    await db.timingDrafts.put(draft);
  });
};

function galleryChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("next-lyr-gallery-changed"));
}

/** Shared session gallery: projects only refer to a content hash. */
export async function putStickerAsset(_projectId: string, sticker: LyricSticker, blob: Blob, sourceHash?: string) {
  const image = await db.transaction("rw", db.galleryAssets, db.galleryImages, async () => {
    const previous = await db.galleryImages.get(sticker.id);
    if (!(await db.galleryAssets.get(sticker.id))) await db.galleryAssets.put({ id: sticker.id, blob });
    const sourceHashes = new Set(previous?.sourceHashes ?? []);
    if (sourceHash) sourceHashes.add(sourceHash);
    const value: GalleryImage = { id: sticker.id, sticker: previous?.sticker ?? sticker,
      sourceHashes: [...sourceHashes], createdAt: previous?.createdAt ?? new Date() };
    await db.galleryImages.put(value);
    return value;
  });
  galleryChanged();
  return image;
}

export async function getStickerBlob(projectId: string, id: string) {
  return (await db.galleryAssets.get(id))?.blob ?? (await db.stickerAssets.get(`${projectId}:${id}`))?.blob;
}

export async function getGalleryImages() {
  return db.galleryImages.orderBy("createdAt").reverse().toArray();
}

/** Promote legacy per-project blobs; removing a project never removes the shared gallery. */
export async function pruneStickerAssets(_projectId: string, stickers: LineStickers) {
  const known = new Map(Object.values(stickers).map((sticker) => [sticker.id, sticker]));
  const old = await db.stickerAssets.toArray();
  for (const record of old) {
    const id = record.key.slice(record.projectId.length + 1);
    let sticker = known.get(id);
    if (!sticker) {
      let width = 256, height = 256;
      if (typeof createImageBitmap === "function") {
        try { const image = await createImageBitmap(record.blob); width = image.width; height = image.height; image.close(); } catch { /* Keep a readable fallback for older assets. */ }
      }
      sticker = { id, name: `image-${id.slice(0, 8)}.${record.blob.type.split("/")[1] || "png"}`,
        mime: record.blob.type, width, height, bytes: record.blob.size, originalBytes: record.blob.size, position: "before" };
    }
    await putStickerAsset(record.projectId, sticker, record.blob);
    await db.stickerAssets.delete(record.key);
  }
  for (const sticker of known.values()) {
    const image = await db.galleryImages.get(sticker.id);
    if (image?.sticker.name.startsWith("image-")) await db.galleryImages.update(sticker.id, { sticker });
  }
  if (old.length || known.size) galleryChanged();
}
