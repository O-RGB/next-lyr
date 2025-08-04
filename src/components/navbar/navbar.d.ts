export type IMenuType = "FILE";
export type ISubMenuType =
  | "FILE_NEW"
  | "SAVE_NCN"
  | "LYRICS_ADD"
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
