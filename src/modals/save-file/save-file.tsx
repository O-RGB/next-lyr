import ButtonCommon from "@/components/button/button";
import ModalCommon from "@/components/modal/modal";
import React, { useEffect, useState } from "react";

interface SaveFileModalProps {
  open?: boolean;
  onClose?: () => void;
}

const SaveFileModal: React.FC<SaveFileModalProps> = ({
  open = false,
  onClose,
}) => {
  const [openModal, setOpenModal] = useState<boolean>(false);

  const handleOpenModal = () => {
    setOpenModal(true);
  };
  const handleCloseModal = () => {
    setOpenModal(false);
    onClose?.();
  };

  useEffect(() => {
    setOpenModal(open);
  }, [open]);
  return (
    <ModalCommon open={openModal} onClose={handleCloseModal}></ModalCommon>
  );
};

export default SaveFileModal;
