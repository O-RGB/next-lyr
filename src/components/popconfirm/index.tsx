import React, { useState, useRef, useEffect } from "react";
import { MdWarning } from "react-icons/md";

interface PopconfirmProps {
  title?: string;
  description?: string;
  okText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  children: React.ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
}

const Popconfirm: React.FC<PopconfirmProps> = ({
  title = "Are you sure?",
  description,
  okText = "Yes",
  cancelText = "No",
  onConfirm,
  onCancel,
  children,
  placement = "top",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (
      popoverRef.current &&
      !popoverRef.current.contains(event.target as Node) &&
      triggerRef.current &&
      !triggerRef.current.contains(event.target as Node)
    ) {
      setIsVisible(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConfirm?.();
    setIsVisible(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCancel?.();
    setIsVisible(false);
  };

  const getPopoverPosition = () => {
    if (!triggerRef.current) return {};

    const rect = triggerRef.current.getBoundingClientRect();
    const popoverStyles: React.CSSProperties = {
      position: "absolute",
    };

    switch (placement) {
      case "top":
        return {
          ...popoverStyles,
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginBottom: "8px",
        };
      case "bottom":
        return {
          ...popoverStyles,
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginTop: "8px",
        };
      case "left":
        return {
          ...popoverStyles,
          right: "100%",
          top: "50%",
          transform: "translateY(-50%)",
          marginRight: "8px",
        };
      case "right":
        return {
          ...popoverStyles,
          left: "100%",
          top: "50%",
          transform: "translateY(-50%)",
          marginLeft: "8px",
        };
      default:
        return popoverStyles;
    }
  };

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onClick={() => setIsVisible(true)}
        className="inline-block cursor-pointer"
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={popoverRef}
          style={getPopoverPosition()}
          className="z-50 min-w-[250px] bg-white rounded-lg shadow-lg border border-gray-200 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="text-yellow-500">
              <MdWarning size={24} />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">{title}</div>
              {description && (
                <div className="mt-1 text-sm text-gray-500">{description}</div>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 active:bg-red-700 rounded-md transition-colors"
                >
                  {okText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Popconfirm;
