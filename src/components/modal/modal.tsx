import React from "react";
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
  return (
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
    >
      <div className="flex flex-col gap-4">
        {title && (
          <div className="flex items-center border-b border-gray-200 pb-4">
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          </div>
        )}
        <div className="max-h-[80vh] overflow-y-auto pr-2">{children}</div>
      </div>
    </Modal>
  );
};

export default ModalCommon;
