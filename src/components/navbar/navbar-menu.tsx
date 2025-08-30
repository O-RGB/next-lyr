import Dropdown from "../common/dropdown/dropdown";
import ButtonCommon from "@/components/common/button";
import Link from "next/link";
import Drawer, { MenuItem } from "../common/drawer";
import React, { useState, useEffect } from "react";
import { BiUndo, BiRedo, BiMenu, BiFolderOpen } from "react-icons/bi";
import { MdOutlineLyrics } from "react-icons/md";
import { IMenusType } from "./navbar.d";
import { FaCode, FaFileUpload, FaSave } from "react-icons/fa";
import { useKaraokeStore } from "@/stores/karaoke-store";

interface NavBarMenuProps {
  onSelectMenu?: (value: IMenusType) => void;
}

const NavBarMemu: React.FC<NavBarMenuProps> = ({ onSelectMenu }) => {
  const { undo, redo } = useKaraokeStore((state) => state.actions);
  const { past, future } = useKaraokeStore((state) => state.history);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsDrawerOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMenuClick = (value: IMenusType) => {
    onSelectMenu?.(value);
    setIsDrawerOpen(false);
  };

  const menuConfig: MenuItem[] = [
    {
      label: "เปิด",
      icon: <BiFolderOpen />,
      onClick: () => handleMenuClick("PROJECT_OPEN"),
    },
    {
      label: "บันทึก",
      icon: <FaSave />,
      onClick: () => handleMenuClick("EXPORT_FILE"),
    },
    {
      label: "เนื้อเพลง",
      icon: <MdOutlineLyrics />,
      onClick: () => handleMenuClick("LYRICS_ADD"),
    },
    {
      label: "ย้อนกลับ",
      icon: <BiUndo />,
      onClick: () => {
        undo();
        setIsDrawerOpen(false);
      },
      disabled: past.length === 0,
      title: "ย้อนกลับ (Ctrl+Z)",
    },
    {
      label: "ก่อนหน้า",
      icon: <BiRedo />,
      onClick: () => {
        redo();
        setIsDrawerOpen(false);
      },
      disabled: future.length === 0,
      title: "ก่อนหน้า (Ctrl+Y)",
    },
  ];

  return (
    <div className="flex justify-between px-2 h-9 items-center">
      <div className="flex items-center">
        <div className="font-bold text-white select-none cursor-default flex gap-2 items-center mr-2">
          <img src="/image.png" alt="Logo" className="w-5 h-5" />
          <span className="hidden sm:inline">Lyrics Editor</span>
        </div>

        {/* Desktop Menu: สร้างจาก config */}
        <div className="flex">
          {menuConfig.map((item, index) =>
            item.children ? (
              <Dropdown key={index} items={item.children}>
                <ButtonCommon
                  variant="ghost"
                  className="!shadow-none !rounded-none !border-none !justify-start text-sm !text-white hover:!bg-white/20"
                  icon={item.icon}
                  size="sm"
                >
                  {item.label}
                </ButtonCommon>
              </Dropdown>
            ) : (
              <ButtonCommon
                key={index}
                variant="ghost"
                childrenClassName="hidden lg:block"
                className="!shadow-none !rounded-none !border-none !justify-start text-sm !text-white hover:!bg-white/20"
                icon={item.icon}
                onClick={item.onClick}
                disabled={item.disabled}
                title={item.title}
                size="sm"
              >
                {item.label}
              </ButtonCommon>
            )
          )}
        </div>
      </div>

      <div className="flex items-center">
        <div className="hidden md:flex items-center">
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

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <ButtonCommon
            onClick={() => setIsDrawerOpen(true)}
            variant="ghost"
            className="!shadow-none !rounded-none !border-none !justify-start text-sm !text-white hover:!bg-white/20"
            size="sm"
          >
            <BiMenu size={24} />
          </ButtonCommon>
        </div>
      </div>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        menuItems={[
          ...menuConfig,
          {
            label: "Source Code",
            icon: <FaCode />,
            href: "/lyr-decode",
          },
        ]}
      />
    </div>
  );
};

export default NavBarMemu;
