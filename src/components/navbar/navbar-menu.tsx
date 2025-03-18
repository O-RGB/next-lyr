import React from "react";
import Dropdown from "../dropdown/dropdown";
import ButtonCommon from "../button/button";
import { BiFile } from "react-icons/bi";
import { MdOutlineLyrics } from "react-icons/md";
import { IMenusType } from "./navbar.type";

interface NavBarMenuProps {
  onSelectMenu?: (value: IMenusType) => void;
}

const NavBarMemu: React.FC<NavBarMenuProps> = ({ onSelectMenu }) => {
  return (
    <div className="flex px-2">
      <div className="flex items-center justify-center px-2">
        <span className="font-bold text-white select-none cursor-default">
          Next Lyrics Editor
        </span>
      </div>
      <Dropdown
        items={[
          {
            label: "เปิดไฟล์ (Mid)",
            onClick: () => onSelectMenu?.("OPEN_MUSIC"),
          },
          // {
          //   label: "New File",
          //   onClick: () => onSelectMenu?.("FILE_NEW"),
          // },
          {
            label: "บันทึก (NCN)",
            onClick: () => onSelectMenu?.("SAVE_NCN"),
          },
        ]}
      >
        <ButtonCommon
          variant="ghost"
          className="!shadow-none !rounded-none !border-none !text-start text-sm !text-white hover:!bg-white/20"
          icon={<BiFile></BiFile>}
        >
          ไฟล์
        </ButtonCommon>
      </Dropdown>
      <ButtonCommon
        variant="ghost"
        className="!shadow-none !rounded-none !border-none !text-start text-sm !text-white hover:!bg-white/20"
        icon={<MdOutlineLyrics></MdOutlineLyrics>}
        onClick={() => onSelectMenu?.("LYRICS_ADD")}
      >
        เนื้อเพลง
      </ButtonCommon>
    </div>
  );
};

export default NavBarMemu;
