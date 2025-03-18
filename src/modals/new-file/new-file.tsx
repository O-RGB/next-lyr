import ButtonCommon from "@/components/button/button";
import ModalCommon from "@/components/modal/modal";
import React, { useEffect, useState } from "react";

interface NewFileModalProps {
  open?: boolean;
  onClose?: () => void;
}

const NewFileModal: React.FC<NewFileModalProps> = ({
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
      <div className="p-4 text-center">
        <div className="mt-4 flex justify-center gap-2">
          <ButtonCommon onClick={onClose} variant="outline">
            Cancel
          </ButtonCommon>
          <ButtonCommon
            onClick={() => {
              window.location.reload();
            }}
            color="danger"
          >
            OK
          </ButtonCommon>
        </div>
      </div>
    </ModalCommon>
  );
};

export default NewFileModal;
