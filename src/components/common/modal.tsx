import React, { useEffect, useRef, useState } from "react";
import { Modal, ModalProps } from "react-responsive-modal";
import { MdClose } from "react-icons/md";
import ButtonCommon, { ButtonCommonProps } from "./button";
import { IoArrowBackCircle } from "react-icons/io5";
import "react-responsive-modal/styles.css";

export interface ModalCommonProps extends ModalProps {
  children?: React.ReactNode;
  title?: React.ReactNode | string;
  modalClassName?: string;
  okButtonProps?: ButtonCommonProps;
  cancelButtonProps?: ButtonCommonProps;
  footer?: React.ReactNode | null;
  destroyOnClose?: boolean;
  animationCloseDuration?: number;
  maxHeight?: string;
}

const ModalCommon: React.FC<ModalCommonProps> = ({
  children,
  title,
  onClose,
  open,
  modalClassName,
  okButtonProps,
  cancelButtonProps,
  footer,
  destroyOnClose = true,
  animationCloseDuration = 300,
  maxHeight = "90dvh", // เปลี่ยนเป็น vh เพื่อความเข้ากันได้กับ iOS
  ...props
}) => {
  const modalContentRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setIsVisible(true);
    } else {
      setIsVisible(false);
      if (destroyOnClose) {
        const timer = setTimeout(
          () => setShouldRender(false),
          animationCloseDuration
        );
        return () => clearTimeout(timer);
      }
    }
  }, [open, destroyOnClose, animationCloseDuration]);

  // iOS Safari fix: prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      // เก็บ scroll position เดิม
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";

      return () => {
        // คืนค่า scroll position
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [open]);

  if (!shouldRender) return null;

  return (
    <Modal
      {...props}
      open={isVisible}
      onClose={onClose}
      center
      blockScroll={false} // ปิด blockScroll ของ library เพราะเราจัดการเอง
      closeIcon={
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200">
          <MdClose className="text-gray-600 text-lg hover:text-gray-800" />
        </div>
      }
      classNames={{
        modal: `!w-[95vw] sm:!w-[90vw] lg:!w-[800px] xl:!w-[900px] !p-0 ${
          modalClassName || ""
        }`,
        ...props.classNames,
      }}
      styles={{
        modalContainer: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2vh 6px",
          minHeight: "90vh",
          // iOS Safari specific fixes
          WebkitOverflowScrolling: "auto",
          // overflowScrolling: "auto",
        },
        modal: {
          WebkitOverflowScrolling: "touch",
          maxHeight: maxHeight,
          borderRadius: "12px",
          backgroundColor: "white",
          boxShadow:
            "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)",
          transition: `all ${animationCloseDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          transform: isVisible ? "scale(1)" : "scale(0.95)",
          opacity: isVisible ? 1 : 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          margin: 0,
          position: "relative",
          // iOS Safari specific
          WebkitTransform: isVisible ? "scale(1)" : "scale(0.95)",
          ...props.styles?.modal,
        },
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(8px)",
          transition: `all ${animationCloseDuration}ms ease`,
          opacity: isVisible ? 1 : 0,
          // iOS Safari fix
          WebkitBackdropFilter: "blur(8px)",
        },
        closeButton: {
          top: "16px",
          right: "16px",
          background: "transparent",
          position: "absolute",
          zIndex: 10,
          border: "none",
          padding: "0",
        },
      }}
      animationDuration={animationCloseDuration}
    >
      <div className="flex flex-col h-full min-h-0">
        {title && (
          <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
            <h2 className="text-xl font-semibold text-gray-800 pr-8">
              {title}
            </h2>
          </div>
        )}

        <div
          ref={modalContentRef}
          className="flex-1 overflow-y-auto p-4"
          style={{
            scrollBehavior: "smooth",
            overscrollBehavior: "contain",
            scrollbarWidth: "thin",
            scrollbarColor: "#CBD5E0 #F7FAFC",
            // iOS Safari specific fixes
            WebkitOverflowScrolling: "touch",
            transform: "translateZ(0)", // Force hardware acceleration
            willChange: "scroll-position", // Optimize for scroll
            // ป้องกันการ bounce ของ iOS
            overflowX: "hidden",
          }}
          // iOS Safari touch event handlers
          onTouchStart={(e) => {
            // Allow native scrolling
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            // Allow native scrolling
            e.stopPropagation();
          }}
        >
          {children}
        </div>

        {footer !== null && (
          <div className="flex-shrink-0 p-4 border-t bg-white">
            {footer ? (
              footer
            ) : (
              <div className="flex items-center justify-end gap-3">
                {cancelButtonProps !== null && (
                  <ButtonCommon
                    size="sm"
                    color="gray"
                    icon={<IoArrowBackCircle />}
                    onClick={onClose}
                    {...cancelButtonProps}
                  >
                    {cancelButtonProps?.children ?? "Cancel"}
                  </ButtonCommon>
                )}
                {okButtonProps !== null && (
                  <ButtonCommon color="primary" size="sm" {...okButtonProps}>
                    {okButtonProps?.children ?? "OK"}
                  </ButtonCommon>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        /* Desktop scrollbar styles */
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* iOS Safari specific fixes */
        @supports (-webkit-touch-callout: none) {
          /* iOS only styles */
          .overflow-y-auto {
            -webkit-overflow-scrolling: touch !important;
            overflow-scrolling: touch !important;
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
            will-change: scroll-position;
          }
        }
      `}</style>
    </Modal>
  );
};

export default ModalCommon;
