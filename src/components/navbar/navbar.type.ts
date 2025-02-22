export type IMenuType = "FILE";
export type ISubMenuType = "FILE_NEW" | "SAVE_NCN" | "LYRICS_ADD" | "OPEN_MUSIC"

export type IMenusType = IMenuType | ISubMenuType;

export interface INavBarItem {
  label?: React.ReactNode;
  value?: string;
  icon?: React.ReactNode;
}
