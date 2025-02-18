import React from "react";
import "react-responsive-modal/styles.css";
import { Modal, ModalProps } from "react-responsive-modal";

interface ModalCommonProps extends ModalProps {
  children?: React.ReactNode;
  title?: string;
}

const ModalCommon: React.FC<ModalCommonProps> = ({
  children,
  title,
  ...props
}) => {
  return (
    <Modal
      {...props}
      styles={{
        modal: {
          width: "90vw",
        },
      }}
      center
    >
      <div className="flex flex-col gap-2">
        {title && <span className="text-xl">{title}</span>}
        {children}
      </div>
    </Modal>
  );
};

export default ModalCommon;
