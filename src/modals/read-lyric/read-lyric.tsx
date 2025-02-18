import ModalCommon from "@/components/modal/modal";
import React, { useEffect, useState } from "react";

interface ReadLyricModalProps {
  open?: boolean;
  onClose?: () => void;
}

const ReadLyricModal: React.FC<ReadLyricModalProps> = ({
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
    <ModalCommon open={openModal} onClose={handleCloseModal}>
        
    </ModalCommon>
  );
};

export default ReadLyricModal;
