import ModalCommon from "@/components/modal/modal";
import Upload from "@/components/upload";
import React, { useEffect, useState } from "react";
import { SiMidi } from "react-icons/si";

interface SelectMusicModalProps {
  open?: boolean;
  onClose?: () => void;
}

const SelectMusicModal: React.FC<SelectMusicModalProps> = ({
  open = false,
  onClose,
}) => {
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [selectedValue, setSelectedValue] = useState<string>("");

  const options = [
    { label: ".mid (Midi)", value: "mid" },
    { label: ".mp3 (Music)", value: "mp3" },
    { label: ".mp4 (Video)", value: "mp4" },
    { label: "Youtube (Online)", value: "youtube" },
  ];

  const handleOpenModal = () => {
    setOpenModal(true);
  };
  const handleCloseModal = () => {
    setOpenModal(false);
    onClose?.();
  };

  const handleOnUpload = async (file: File) => {};

  useEffect(() => {
    setOpenModal(open);
  }, [open]);
  return (
    <>
      <ModalCommon
        title="เลือกเพลง"
        open={openModal}
        onClose={handleCloseModal}
      >
        <Upload
          accept=".mid,.MID"
          onChange={(files) => {
            if (files.length === 1) {
              handleOnUpload(files[0]);
            }
          }}
          icon={<SiMidi className="text-4xl text-blue-500" />}
        ></Upload>
        {/* <RadioGroup
          value={selectedValue}
          onChange={setSelectedValue}
          options={options}
          name="fruits"
        /> */}
      </ModalCommon>
    </>
  );
};

export default SelectMusicModal;
