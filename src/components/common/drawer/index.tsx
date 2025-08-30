import React, { useState, useEffect } from "react";
import { BiX, BiChevronDown, BiChevronUp } from "react-icons/bi";
import ButtonCommon from "@/components/common/button";
import Link from "next/link";

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
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsClosing(false);
      setIsOpening(true);
      // ให้ opening animation เริ่มหลังจาก component mount
      const timer = setTimeout(() => {
        setIsOpening(false);
      }, 50); // เล็กน้อยเพื่อให้ transition ทำงาน
      return () => clearTimeout(timer);
    } else if (isVisible) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
      }, 300); // Same duration as animation
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVisible]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300); // Same duration as animation
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black z-40 md:hidden transition-opacity duration-300 ${
          isClosing
            ? "bg-opacity-0"
            : isOpening
            ? "bg-opacity-0"
            : "bg-opacity-50"
        }`}
        onClick={handleClose}
      ></div>

      {/* Drawer Content */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-gray-800 z-50 p-4 flex flex-col text-white transition-transform duration-300 ease-out ${
          isClosing
            ? "transform translate-x-full"
            : isOpening
            ? "transform translate-x-full"
            : "transform translate-x-0"
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <span className="font-bold">Menu</span>
          <ButtonCommon
            variant="ghost"
            className="!shadow-none !rounded-none !border-none !justify-start text-sm !text-white hover:!bg-white/20"
            onClick={handleClose}
            size="sm"
          >
            <BiX size={24} />
          </ButtonCommon>
        </div>
        <div className="flex flex-col gap-1">
          {menuItems.map((item, index) =>
            item.children ? (
              <SubMenu key={index} item={item} />
            ) : item.href ? (
              <Link key={index} href={item.href} onClick={handleClose}>
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

      {/* Remove custom CSS animation - now using Tailwind transitions */}
      <style jsx global>{``}</style>
    </>
  );
};

export default Drawer;
