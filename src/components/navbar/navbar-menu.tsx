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
    <div className="flex">
      <Dropdown
        items={[
          {
            label: "New File",
            onClick: () => onSelectMenu?.("FILE_NEW"),
          },
          {
            label: "Save (NCN)",
            onClick: () => onSelectMenu?.("SAVE_NCN"),
          },
        ]}
      >
        <ButtonCommon
          color="transparent"
          className="!shadow-none !rounded-none !border-none !text-start text-sm"
          icon={<BiFile></BiFile>}
        >
          ไฟล์
        </ButtonCommon>
      </Dropdown>
      <ButtonCommon
        color="transparent"
        className="!shadow-none !rounded-none !border-none !text-start text-sm"
        icon={<MdOutlineLyrics></MdOutlineLyrics>}
        onClick={() => onSelectMenu?.("LYRICS_ADD")}
      >
        เนื้อเพลง
      </ButtonCommon>
    </div>
  );
};

export default NavBarMemu;
