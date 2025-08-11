// src/lib/database/db.ts
import Dexie, { Table } from "dexie";
import { KaraokeState } from "@/stores/karaoke-store";
import { MusicMode, IMidiInfo } from "@/types/common.type";

// <<< เพิ่ม: Interface นี้เพื่อกำหนดรูปแบบการจัดเก็บข้อมูลไฟล์
export interface StoredFile {
  buffer: ArrayBuffer;
  name: string;
  type: string;
}

// <<< แก้ไข: อัปเดต PlayerState ให้ใช้ StoredFile
export interface PlayerState {
  midiInfo: IMidiInfo | null;
  storedFile: StoredFile | null; // จะเก็บข้อมูลไฟล์ที่แปลงแล้วที่นี่
  duration: number | null;
  youtubeId: string | null;
  // ไม่ต้องเก็บ audioSrc, videoSrc, หรือ rawFile ในฐานข้อมูล
}

// <<< แก้ไข: อัปเดต ProjectData ให้ใช้ PlayerState รูปแบบใหม่
export interface ProjectData {
  playerState: PlayerState;
  lyricsData: KaraokeState["lyricsData"];
  chordsData: KaraokeState["chordsData"];
  metadata: KaraokeState["metadata"];
  currentTime: KaraokeState["currentTime"];
  selectedLineIndex: KaraokeState["selectedLineIndex"];
  chordPanelCenterTick: KaraokeState["chordPanelCenterTick"];
  isChordPanelAutoScrolling: KaraokeState["isChordPanelAutoScrolling"];
}

export interface Project {
  id?: number;
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
    // <<< สำคัญ: เพิ่มเวอร์ชันเป็น 5 เพื่ออัปเดตโครงสร้างฐานข้อมูล
    this.version(5).stores({
      projects: "++id, name, createdAt, updatedAt",
    });
  }
}

const db = new MySubClassedDexie();

export const createProject = async (
  name: string,
  mode: MusicMode,
  initialData: ProjectData
): Promise<number> => {
  try {
    const newProject: Project = {
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
  return await db.projects.orderBy("updatedAt").reverse().toArray();
};

export const getProject = async (id: number): Promise<Project | undefined> => {
  return await db.projects.get(id);
};

export const updateProject = async (
  id: number,
  data: ProjectData
): Promise<void> => {
  try {
    // ใช้ `update` เพื่ออัปเดตเฉพาะ data และ updatedAt
    await db.projects.update(id, {
      data,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error(`Failed to update project ${id}:`, error);
    throw error;
  }
};

export const deleteProject = async (id: number): Promise<void> => {
  try {
    await db.projects.delete(id);
  } catch (error) {
    console.error(`Failed to delete project ${id}:`, error);
    throw error;
  }
};
