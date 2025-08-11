// src/components/navbar/drawer.tsx
import React, { useState } from "react";
import { BiX, BiChevronDown, BiChevronUp } from "react-icons/bi";
import ButtonCommon from "@/components/common/button";
import Link from "next/link";

// Type สำหรับโครงสร้างเมนู
export interface MenuItem {
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  children?: MenuItem[];
  href?: string;
  disabled?: boolean;
  title?: string;
}

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
}

// Component ย่อยสำหรับจัดการ Submenu
const SubMenu: React.FC<{ item: MenuItem }> = ({ item }) => {
  const [isSubMenuOpen, setSubMenuOpen] = useState(false);

  if (!item.children) return null;

  return (
    <div>
      <ButtonCommon
        variant="ghost"
        className="!shadow-none !rounded-none !border-none !justify-between text-sm !text-white hover:!bg-white/20 w-full"
        icon={item.icon}
        onClick={() => setSubMenuOpen(!isSubMenuOpen)}
      >
        <span>{item.label}</span>
        {isSubMenuOpen ? <BiChevronUp /> : <BiChevronDown />}
      </ButtonCommon>
      {isSubMenuOpen && (
        <div className="pl-8 flex flex-col items-start py-1">
          {item.children.map((child, index) => (
            <ButtonCommon
              key={index}
              variant="ghost"
              className="!shadow-none !rounded-none !border-none !justify-start text-sm !text-white/80 hover:!text-white hover:!bg-white/10 w-full"
              icon={child.icon}
              onClick={child.onClick}
              disabled={child.disabled}
              title={child.title}
            >
              {child.label}
            </ButtonCommon>
          ))}
        </div>
      )}
    </div>
  );
};

const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, menuItems }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
        onClick={onClose}
      ></div>

      {/* Drawer Content */}
      <div className="fixed top-0 left-0 h-full w-64 bg-gray-800 z-50 p-4 flex flex-col text-white animate-slide-in">
        <div className="flex justify-between items-center mb-4">
          <span className="font-bold">Menu</span>
          <ButtonCommon
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-white"
          >
            <BiX size={24} />
          </ButtonCommon>
        </div>
        <div className="flex flex-col gap-1">
          {menuItems.map((item, index) =>
            item.children ? (
              <SubMenu key={index} item={item} />
            ) : item.href ? (
              <Link key={index} href={item.href} onClick={onClose}>
                <ButtonCommon
                  variant="ghost"
                  className="!shadow-none !rounded-none !border-none !justify-start text-sm !text-white hover:!bg-white/20 w-full"
                  icon={item.icon}
                  disabled={item.disabled}
                  title={item.title}
                >
                  {item.label}
                </ButtonCommon>
              </Link>
            ) : (
              <ButtonCommon
                key={index}
                variant="ghost"
                className="!shadow-none !rounded-none !border-none !justify-start text-sm !text-white hover:!bg-white/20 w-full"
                icon={item.icon}
                onClick={item.onClick}
                disabled={item.disabled}
                title={item.title}
              >
                {item.label}
              </ButtonCommon>
            )
          )}
        </div>
      </div>

      {/* Add CSS animation for drawer */}
      <style jsx global>{`
        @keyframes slide-in {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default Drawer;
