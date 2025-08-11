import { useState, useEffect, useRef } from "react";
import {
  FaShare,
  FaHeart,
  FaStar,
  FaComment,
  FaCog,
  FaCamera,
  FaTimes,
  FaPlus,
} from "react-icons/fa";
import ButtonCommon, { ButtonColor } from "../button";

interface FloatingButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  label?: string;
  delay?: number;
  color?: ButtonColor;
}

const FloatingButton: React.FC<FloatingButtonProps> = ({
  onClick,
  children,
  className,
  label,
  delay = 0,
  color = "white",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldShow, setShouldShow] = useState(true);

  useEffect(() => {
    if (shouldShow) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [delay, shouldShow]);

  // รับ signal จาก parent component เพื่อปิด
  useEffect(() => {
    const handleClose = () => {
      setShouldShow(false);
    };

    // Listen to custom event
    document.addEventListener("closeFloatingButtons", handleClose);
    return () =>
      document.removeEventListener("closeFloatingButtons", handleClose);
  }, []);

  return (
    <div
      className={`floating-button-item transition-all duration-300 ease-out ${
        isVisible
          ? "transform translate-x-0 scale-100 opacity-100"
          : "transform translate-x-24 scale-0 opacity-0"
      }`}
    >
      <div className="flex items-center gap-3">
        {label && (
          <div className="bg-white/95 backdrop-blur-sm text-sm text-gray-700 px-4 py-2 rounded-full shadow-lg border border-white/20 whitespace-nowrap">
            {label}
          </div>
        )}
        <ButtonCommon
          onClick={onClick}
          circle
          color={color}
          size="lg"
          className={`shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95 transition-all duration-200 ${className}`}
        >
          {children}
        </ButtonCommon>
      </div>
    </div>
  );
};

export interface FloatingActionButton {
  icon: React.ReactNode;
  onClick: () => void;
  label: string;
  className?: string;
  color?: ButtonColor;
}

interface FloatingButtonGroupProps {
  actions?: FloatingActionButton[];
}

export const FloatingButtonGroup: React.FC<FloatingButtonGroupProps> = ({
  actions = [
    {
      icon: <FaShare size={18} />,
      onClick: () => alert("Share clicked!"),
      label: "แชร์",
      color: "primary" as ButtonColor,
    },
    {
      icon: <FaHeart size={18} />,
      onClick: () => alert("Like clicked!"),
      label: "ถูกใจ",
      color: "danger" as ButtonColor,
    },
    {
      icon: <FaStar size={18} />,
      onClick: () => alert("Favorite clicked!"),
      label: "รายการโปรด",
      color: "warning" as ButtonColor,
    },
    {
      icon: <FaComment size={18} />,
      onClick: () => alert("Comment clicked!"),
      label: "แสดงความคิดเห็น",
      color: "success" as ButtonColor,
    },
    {
      icon: <FaCog size={18} />,
      onClick: () => alert("Settings clicked!"),
      label: "ตั้งค่า",
      color: "gray" as ButtonColor,
    },
    {
      icon: <FaCamera size={18} />,
      onClick: () => alert("Camera clicked!"),
      label: "ถ่ายภาพ",
      color: "secondary" as ButtonColor,
    },
  ],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ปิด floating menu เมื่อคลิกที่อื่น
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        handleCloseMenu();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // ปิด floating menu เมื่อกด ESC
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCloseMenu();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [isOpen]);

  // จัดการการแสดง/ซ่อน backdrop และ buttons
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    }
  }, [isOpen]);

  // ฟังก์ชันสำหรับปิดเมนูแบบ delayed
  const handleCloseMenu = () => {
    if (!isOpen) return;

    // ส่ง event ให้ FloatingButton components ปิด animation
    document.dispatchEvent(new Event("closeFloatingButtons"));

    // ปิด backdrop
    setIsOpen(false);

    // รอ animation เสร็จก่อนซ่อน DOM elements
    setTimeout(() => {
      setShouldRender(false);
    }, 300);
  };

  const handleToggleMenu = () => {
    if (isOpen) {
      handleCloseMenu();
    } else {
      setIsOpen(true);
    }
  };

  const handleActionClick = (action: FloatingActionButton) => {
    action.onClick();
    handleCloseMenu(); // ใช้ handleCloseMenu แทน setIsOpen
  };

  return (
    <>
      {/* Backdrop/Overlay */}
      {shouldRender && (
        <div
          className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={handleCloseMenu}
        />
      )}

      {/* Floating Button Container */}
      <div
        ref={containerRef}
        className="fixed bottom-6 right-6 flex flex-col items-end gap-4 z-40"
      >
        {/* Action Buttons */}
        <div className="flex flex-col items-end gap-3">
          {shouldRender &&
            actions.map((action, index) => (
              <FloatingButton
                key={index}
                onClick={() => handleActionClick(action)}
                label={action.label}
                delay={isOpen ? index * 60 : 0}
                color={action.color || "white"}
              >
                {action.icon}
              </FloatingButton>
            ))}
        </div>

        {/* Main Toggle Button */}
        <ButtonCommon
          onClick={handleToggleMenu}
          circle
          color={isOpen ? "danger" : "primary"}
          size="lg"
          className={`shadow-2xl transform hover:scale-110 active:scale-95 transition-all duration-300 ${
            isOpen ? "rotate-45" : ""
          } ${isOpen ? "animate-pulse" : ""}`}
        >
          <div className="relative text-white transition-transform duration-300">
            {isOpen ? <FaTimes size={20} /> : <FaPlus size={20} />}
          </div>
        </ButtonCommon>
      </div>
    </>
  );
};

export default FloatingButtonGroup;
