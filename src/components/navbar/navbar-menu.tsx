// src/components/navbar/navbar-menu.tsx

import React from "react";
import Dropdown from "../common/dropdown/dropdown";
import { BiFile, BiUndo, BiRedo } from "react-icons/bi"; // ++ เพิ่ม Icon ++
import { MdOutlineLyrics, MdSwitchAccount } from "react-icons/md";
import { IMenusType } from "./navbar.d";
import ButtonCommon from "@/components/common/button";
import { FaCode } from "react-icons/fa";
import Link from "next/link";
import { useKaraokeStore } from "@/stores/karaoke-store"; // ++ เพิ่ม import store ++

interface NavBarMenuProps {
  onSelectMenu?: (value: IMenusType) => void;
}

const NavBarMemu: React.FC<NavBarMenuProps> = ({ onSelectMenu }) => {
  // ++ ดึง actions และ history state จาก store ++
  const { undo, redo } = useKaraokeStore((state) => state.actions);
  const { past, future } = useKaraokeStore((state) => state.history);
  const mode = useKaraokeStore((state) => state.mode);

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
              {
                label: "บันทึกไฟล์",
                onClick: () => onSelectMenu?.("SAVE_NCN"),
              },
              {
                label: `MIDI ${mode === "midi" ? " ✓" : ""}`,
                onClick: () => onSelectMenu?.("MODE_MIDI"),
              },
              {
                label: `MP3 ${mode === "mp3" ? " ✓" : ""}`,
                onClick: () => onSelectMenu?.("MODE_MP3"),
              },
              {
                label: `MP4 ${mode === "mp4" ? " ✓" : ""}`,
                onClick: () => onSelectMenu?.("MODE_MP4"),
              },
              {
                label: `YouTube ${mode === "youtube" ? " ✓" : ""}`,
                onClick: () => onSelectMenu?.("MODE_YOUTUBE"),
              },
            ]}
          >
            <ButtonCommon
              variant="ghost"
              className="!shadow-none !rounded-none !border-none !text-start text-sm !text-white hover:!bg-white/20"
              icon={<BiFile />}
            >
              ไฟล์
            </ButtonCommon>
          </Dropdown>
          <ButtonCommon
            variant="ghost"
            className="!shadow-none !rounded-none !border-none !text-start text-sm !text-white hover:!bg-white/20"
            icon={<MdOutlineLyrics />}
            onClick={() => onSelectMenu?.("LYRICS_ADD")}
          >
            เนื้อเพลง
          </ButtonCommon>

          {/* ++ เพิ่มปุ่ม Undo/Redo ++ */}
          <ButtonCommon
            variant="ghost"
            className="!shadow-none !rounded-none !border-none !text-start text-sm !text-white hover:!bg-white/20"
            icon={<BiUndo />}
            onClick={undo}
            disabled={past.length === 0}
            title="ย้อนกลับ (Ctrl+Z)"
          >
            ย้อนกลับ
          </ButtonCommon>
          <ButtonCommon
            variant="ghost"
            className="!shadow-none !rounded-none !border-none !text-start text-sm !text-white hover:!bg-white/20"
            icon={<BiRedo />}
            onClick={redo}
            disabled={future.length === 0}
            title="ทำซ้ำ (Ctrl+Y)"
          >
            ทำซ้ำ
          </ButtonCommon>
          {/* ++ จบส่วนปุ่ม Undo/Redo ++ */}
        </div>
        <div className="flex items-center">
          <Link href={"/lyr-decode"}>
            <ButtonCommon
              color="white"
              size="sm"
              className="!p-1 !px-3"
              icon={<FaCode />}
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
