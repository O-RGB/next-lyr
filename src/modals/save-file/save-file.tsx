import ButtonCommon from "@/components/button/button";
import ModalCommon from "@/components/modal/modal";
import CurExport from "@/tools/export/cur-export";
import LyrExport from "@/tools/export/lyr-export";
import MidExport from "@/tools/export/midi-export";
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
    <ModalCommon title="Save As" open={openModal} onClose={handleCloseModal}>
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-xs text-gray-500">Download (.cur)</div>
          <CurExport></CurExport>
        </div>
        <div>
          <div className="text-xs text-gray-500">Download (.lyr)</div>
          <LyrExport></LyrExport>
        </div>
        <div>
          <div className="text-xs text-gray-500">Download (.mid)</div>
          <MidExport></MidExport>
        </div>
      </div>
    </ModalCommon>
  );
};

export default SaveFileModal;
