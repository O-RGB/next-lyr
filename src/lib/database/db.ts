import Dexie, { Table } from "dexie";
import { MusicMode, IMidiInfo } from "@/types/common.type";
import { generateUUID } from "@/lib/uuid";
import { KaraokeState } from "@/stores/karaoke-store/types";
import { createStoredFileFromFile } from "@/stores/karaoke-store/utils";
import { IMidiParseResult } from "../karaoke/midi/types";
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
  lyricsDocument?: LyricsDocument | null;
  lyricsXml?: string;
  chordsData: KaraokeState["chordsData"];
  metadata: KaraokeState["metadata"];
  soundfonts?: SoundfontEntry[];
  activeSoundfontId?: string;
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
  }
}

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
  return await db.projects.get(id);
};

export const updateProject = async (
  id: string,
  data: ProjectData
): Promise<void> => {
  try {
    const updatedAt = new Date();
    await db.projects.update(id, { data, updatedAt });

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
      db.projects,
      db.soundfontBlobs,
      projectSummaries,
      async () => {
        await db.projects.delete(id);
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
      db.projects,
      db.soundfontBlobs,
      projectSummaries,
      async () => {
        await db.projects.clear();
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
