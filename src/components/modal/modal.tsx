import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import "react-responsive-modal/styles.css";
import { Modal, ModalProps } from "react-responsive-modal";
import { MdClose } from "react-icons/md";

interface ModalCommonProps extends ModalProps {
  children?: React.ReactNode;
  title?: string;
}

const ModalCommon: React.FC<ModalCommonProps> = ({
  children,
  title,
  onClose,
  open,
  ...props
}) => {
  // Handle background scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  return ReactDOM.createPortal(
    <Modal
      {...props}
      open={open}
      onClose={onClose}
      center
      closeIcon={
        <MdClose className="text-gray-600 text-xl hover:text-gray-800 transition-colors" />
      }
      styles={{
        modal: {
          width: "90vw",
          maxWidth: "800px",
          borderRadius: "8px",
          padding: "24px",
          backgroundColor: "white",
          boxShadow:
            "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        },
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(4px)",
        },
        closeButton: {
          top: "16px",
          right: "16px",
          background: "transparent",
        },
      }}
      animationDuration={200}
      container={document.body} // ให้ modal อยู่บนสุด
    >
      <div className="flex flex-col gap-4">
        {title && (
          <div className="flex items-center border-b border-gray-200 pb-4">
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          </div>
        )}
        <div className="max-h-[80vh] overflow-y-auto pr-2">{children}</div>
      </div>
    </Modal>,
    document.body // Portal ไปที่ `document.body` เพื่อให้ modal อยู่บนสุด
  );
};

export default ModalCommon;
