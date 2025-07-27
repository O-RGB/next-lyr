import React, { useState } from "react";
import { ModalProps } from "react-responsive-modal";
import ModalCommon from "./modal";

import {
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
} from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import ButtonCommon, { ButtonCommonProps } from "./button";

type AlertType = "denger" | "error" | "warning" | "success" | "info";

interface PopConfirmCommonProps extends Omit<ModalProps, "open" | "onClose"> {
  children?: React.ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  type?: AlertType;
  title?: string;
  content?: React.ReactNode;
  openbuttonProps?: ButtonCommonProps;
}

const alertConfig: Record<
  AlertType,
  { icon: React.ReactNode; colorClass: string }
> = {
  error: {
    icon: <FaTimesCircle />,
    colorClass: "text-red-500",
  },
  warning: {
    icon: <FaExclamationTriangle />,
    colorClass: "text-yellow-500",
  },
  success: {
    icon: <FaCheckCircle />,
    colorClass: "text-green-500",
  },
  info: {
    icon: <FaInfoCircle />,
    colorClass: "text-blue-500",
  },
  denger: {
    icon: <MdDelete />,
    colorClass: "text-red-500",
  },
};

const PopConfirmCommon: React.FC<PopConfirmCommonProps> = ({
  children,
  onConfirm,
  onCancel,
  type = "denger",
  title = "Are you sure to delete this task?",
  content,
  openbuttonProps,
  ...rest
}) => {
  const [openAlert, setOpenAlert] = useState<boolean>(false);

  const handleOpen = () => setOpenAlert(true);
  const handleClose = () => setOpenAlert(false);

  const handleConfirm = () => {
    onConfirm?.();
    handleClose();
  };

  const handleCancel = () => {
    onCancel?.();
    handleClose();
  };

  const { icon, colorClass } = alertConfig[type];

  return (
    <>
      <ButtonCommon {...openbuttonProps} onClick={handleOpen}>
        {openbuttonProps?.children}
      </ButtonCommon>
      <ModalCommon
        modalId="popconfrim"
        open={openAlert}
        onClose={handleClose}
        okButtonProps={{
          color: type === "error" || type === "denger" ? "danger" : "primary",
          onClick: handleConfirm,
          children: "Yes",
          icon: icon,
        }}
        cancelButtonProps={{
          color: "gray",
          onClick: handleCancel,
          children: "No",
        }}
        classNames={{
          modal: "!w-[90vw] lg:!w-[500px]",
        }}
        styles={{
          modal: { width: "auto" },
        }}
        {...rest}
        title={
          <div className="flex items-center gap-3">
            <span className={`${colorClass} mb-0.5`}>{icon}</span>
            <span>{title}</span>
          </div>
        }
      >
        <div>{content || "Are you sure you want to proceed?"}</div>
      </ModalCommon>
    </>
  );
};

export default PopConfirmCommon;
