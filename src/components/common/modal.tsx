import React, { useEffect, useRef, useState } from "react";
import { Modal, ModalProps } from "react-responsive-modal";
import { MdClose } from "react-icons/md";
import "react-responsive-modal/styles.css";
import ButtonCommon, { ButtonCommonProps } from "./button";
import { IoArrowBackCircle } from "react-icons/io5";

export interface ModalCommonProps extends ModalProps {
  children?: React.ReactNode;
  title?: React.ReactNode | string;
  modalClassName?: string;
  okButtonProps?: ButtonCommonProps;
  cancelButtonProps?: ButtonCommonProps;
  footer?: React.ReactNode | null;
  destroyOnClose?: boolean;
  animationCloseDuration?: number;
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
  animationCloseDuration = 200,
  ...props
}) => {
  const modalContentRef = useRef<HTMLDivElement | null>(null);

  const [isVisible, setIsVisible] = useState(open);
  const [shouldRender, setShouldRender] = useState(open);

  useEffect(() => {
    if (open) {
      setShouldRender(true);

      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      if (destroyOnClose) {
        setTimeout(() => setShouldRender(false), animationCloseDuration);
      }
    }
  }, [open, destroyOnClose, animationCloseDuration]);

  if (!shouldRender) return null;

  return (
    <Modal
      {...props}
      open={isVisible}
      onClose={onClose}
      center
      closeIcon={
        <MdClose className="text-gray-600 text-xl hover:text-gray-800 transition-colors" />
      }
      classNames={{
        modal: "!w-[90vw] lg:!w-[800px] p-[18px] lg:p-[24px]",
        ...props.classNames,
      }}
      styles={{
        modal: {
          borderRadius: "8px",
          // padding: "24px",
          backgroundColor: "white",
          boxShadow:
            "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          transition: `opacity ${animationCloseDuration}ms ease`,
          opacity: isVisible ? 1 : 0,
          ...props.styles?.modal,
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
      animationDuration={animationCloseDuration}
    >
      <div className="flex flex-col gap-2">
        {title && (
          <div className="flex items-center border-b border-gray-200 pb-4">
            <div className="text-xl font-semibold text-gray-800">{title}</div>
          </div>
        )}
        <div
          ref={modalContentRef}
          className="max-h-[80vh] overflow-y-auto pr-2 pt-2"
        >
          {children}
        </div>
        {footer ? (
          footer
        ) : (
          <div className="flex items-center justify-end gap-2">
            <ButtonCommon
              color="gray"
              icon={<IoArrowBackCircle />}
              onClick={onClose}
              {...cancelButtonProps}
            >
              {cancelButtonProps?.children ?? "Cancel"}
            </ButtonCommon>
            <ButtonCommon color={"primary"} {...okButtonProps}>
              {okButtonProps?.children ?? "Ok"}
            </ButtonCommon>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ModalCommon;
