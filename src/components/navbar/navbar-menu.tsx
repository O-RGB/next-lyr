import React from "react";
import Dropdown from "../common/dropdown/dropdown";
import { BiFile } from "react-icons/bi";
import { MdOutlineLyrics } from "react-icons/md";
import { IMenusType } from "./navbar";
import ButtonCommon from "@/components/common/button";
import { FaCode, FaFile } from "react-icons/fa";
import Link from "next/link";

interface NavBarMenuProps {
  onSelectMenu?: (value: IMenusType) => void;
}

const NavBarMemu: React.FC<NavBarMenuProps> = ({ onSelectMenu }) => {
  return (
    <div className="">
      <div className="flex justify-between px-2">
        <div className="flex">
          <div className="flex items-center justify-center px-2">
            <div className="font-bold text-white select-none cursor-default flex gap-2 items-center">
              <img src="/image.png" alt="" className="w-5 h-5 mb-1" />
              <span>Lyrics Editor</span>
            </div>
          </div>
          <Dropdown
            items={[
              // {
              //   label: "เปิดไฟล์ (Mid)",
              //   onClick: () => onSelectMenu?.("OPEN_MUSIC"),
              // },
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
        <div className="flex items-center">
          <Link href={"/lyr-decode"}>
            <ButtonCommon
              color="white"
              size="sm"
              className="!p-1 !px-3"
              icon={<FaCode></FaCode>}
            >
              <span className="text-xs">Source Code</span>
            </ButtonCommon>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NavBarMemu;
