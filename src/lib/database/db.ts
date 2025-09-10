import Dexie, { Table } from "dexie";
import { MusicMode, IMidiInfo } from "@/types/common.type";
import { generateUUID } from "@/lib/uuid";
import { KaraokeState } from "@/stores/karaoke-store/types";
import { createStoredFileFromFile } from "@/stores/karaoke-store/utils";
import { IMidiParseResult } from "../karaoke/midi/types";

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
  chordsData: KaraokeState["chordsData"];
  metadata: KaraokeState["metadata"];
}

export interface Project {
  id: string;
  name: string;
  mode: MusicMode;
  data: ProjectData;
  createdAt: Date;
  updatedAt: Date;
}

export class MySubClassedDexie extends Dexie {
  projects!: Table<Project>;

  constructor() {
    super("karaokeProjectDB");

    this.version(6).stores({
      projects: "&id, name, createdAt, updatedAt",
    });
  }
}

const db = new MySubClassedDexie();

export const createProject = async (
  name: string,
  mode: MusicMode,
  initialData: ProjectData,
  musicFile: File | null
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
    const id = await db.projects.add(newProject);
    return id;
  } catch (error) {
    console.error("Failed to create project:", error);
    throw error;
  }
};

export const getAllProjects = async (): Promise<Project[]> => {
  return await db.projects.orderBy("createdAt").reverse().toArray();
};

export const getProject = async (id: string): Promise<Project | undefined> => {
  return await db.projects.get(id);
};

export const updateProject = async (
  id: string,
  data: ProjectData
): Promise<void> => {
  try {
    await db.projects.update(id, {
      data,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error(`Failed to update project ${id}:`, error);
    throw error;
  }
};

export const deleteProject = async (id: string): Promise<void> => {
  try {
    await db.projects.delete(id);
  } catch (error) {
    console.error(`Failed to delete project ${id}:`, error);
    throw error;
  }
};
