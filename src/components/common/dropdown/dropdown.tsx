import React, { useState, useRef, useEffect } from "react";
import { IOptions } from "@/types/common.type";
import ButtonCommon from "@/components/common/button";

interface DropdownProps {
  children?: React.ReactNode;
  items: IOptions[];
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  children,
  items,
  className = "",
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleOptionClick = (action?: () => void) => {
    if (action) {
      action();
    }
    setOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      className={`relative ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!open) setOpen(true);
      }}
    >
      {children}
      {open && items && (
        <div className="absolute left-0 mt-1 bg-white border border-purple-500 shadow-lg rounded-sm z-10 min-w-40">
          <div className="w-full h-full flex flex-col ">
            {items.map((subItem, index) => (
              <React.Fragment key={`${subItem.label}-${index}`}>
                <ButtonCommon
                  variant="ghost"
                  className="!shadow-none !rounded-none !border-none !justify-start !text-black hover:!bg-purple-500/20"
                  onClick={() => handleOptionClick(subItem.onClick)}
                >
                  {subItem.label}
                </ButtonCommon>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
