// src/components/navbar/navbar.d.ts
export type IMenuType = "FILE";
export type ISubMenuType =
  | "EXPORT_FILE" // <<< เปลี่ยน
  | "LYRICS_ADD"
  | "PROJECT_OPEN" // <<< เปลี่ยน
  | "OPEN_MUSIC"
  | "MODE_MIDI"
  | "MODE_MP3"
  | "MODE_MP4"
  | "MODE_YOUTUBE";

export type IMenusType = IMenuType | ISubMenuType;

export interface INavBarItem {
  label?: React.ReactNode;
  value?: string;
  icon?: React.ReactNode;
}
