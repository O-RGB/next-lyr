"use client";

import { create } from "zustand";
import { db, type EditorFontRecord } from "@/lib/database/db";

export type BuiltInFontId = "noto-thai" | "system";
export type FontSelection = BuiltInFontId | `custom:${string}`;

export interface CustomFontOption {
  id: string;
  name: string;
  family: string;
  bytes: number;
}

export const BUILT_IN_FONTS: Array<{
  id: BuiltInFontId;
  name: string;
  description: string;
}> = [
  {
    id: "noto-thai",
    name: "Noto Sans Thai Looped",
    description: "ไทย / English / Unicode ทั่วไป",
  },
  {
    id: "system",
    name: "System Sans",
    description: "ใช้ฟอนต์ของระบบปฏิบัติการ",
  },
];

interface FontStoreState {
  customFonts: CustomFontOption[];
  loaded: boolean;
  load: () => Promise<void>;
  importFont: (file: File) => Promise<CustomFontOption>;
  removeFont: (id: string) => Promise<void>;
}

export const useFontStore = create<FontStoreState>((set, get) => ({
  customFonts: [],
  loaded: false,

  load: async () => {
    if (get().loaded || typeof window === "undefined") return;
    const records = await db.editorFonts.orderBy("createdAt").toArray();
    const options = records.map(toOption);
    await Promise.all(records.map(loadFontRecord));
    set({ customFonts: options, loaded: true });
  },

  importFont: async (file) => {
    if (file.size > 20 * 1024 * 1024) {
      throw new Error("ไฟล์ฟอนต์ต้องมีขนาดไม่เกิน 20 MB");
    }
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["woff2", "woff", "ttf", "otf"].includes(extension)) {
      throw new Error("รองรับฟอนต์ .woff2, .woff, .ttf และ .otf เท่านั้น");
    }

    const id = crypto.randomUUID();
    const family = `NextLyrFont_${id.replaceAll("-", "")}`;
    const record: EditorFontRecord = {
      id,
      name: file.name,
      family,
      type: file.type || `font/${extension}`,
      bytes: file.size,
      buffer: await file.arrayBuffer(),
      createdAt: new Date(),
    };
    await db.editorFonts.put(record);
    await loadFontRecord(record);
    const option = toOption(record);
    set({ customFonts: [...get().customFonts, option], loaded: true });
    return option;
  },

  removeFont: async (id) => {
    await db.editorFonts.delete(id);
    set({ customFonts: get().customFonts.filter((font) => font.id !== id) });
  },
}));

export function getFontFamily(
  selection: FontSelection,
  customFonts: CustomFontOption[]
): string {
  if (selection === "system") return "ui-sans-serif, system-ui, sans-serif";
  if (selection === "noto-thai") {
    return "var(--font-noto-sans-thai), ui-sans-serif, sans-serif";
  }
  const custom = customFonts.find((font) => `custom:${font.id}` === selection);
  return custom
    ? `"${custom.family}", var(--font-noto-sans-thai), sans-serif`
    : "var(--font-noto-sans-thai), ui-sans-serif, sans-serif";
}

function toOption(record: EditorFontRecord): CustomFontOption {
  return {
    id: record.id,
    name: record.name,
    family: record.family,
    bytes: record.bytes,
  };
}

async function loadFontRecord(record: EditorFontRecord): Promise<void> {
  if (typeof document === "undefined") return;
  const font = new FontFace(record.family, record.buffer, {
    style: "normal",
    weight: "100 900",
  });
  await font.load();
  document.fonts.add(font);
}
