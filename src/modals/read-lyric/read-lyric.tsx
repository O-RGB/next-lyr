import ButtonCommon from "@/components/button/button";
import ModalCommon from "@/components/modal/modal";
import TextAreaCommon from "@/components/textarea";
import useLyricsStore from "@/stores/lyrics-store";
import React, { useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa";

interface ReadLyricModalProps {
  open?: boolean;
  onClose?: () => void;
}

const ReadLyricModal: React.FC<ReadLyricModalProps> = ({
  open = false,
  onClose,
}) => {
  const setLyrics = useLyricsStore((state) => state.setLyrics);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [text, setText] = useState<string>("");

  const isDisabled = !text.trim();

  const handleCloseModal = () => {
    setOpenModal(false);
    onClose?.();
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDisabled) {
      const lines = text.split("\n");
      setLyrics(lines);
      setText("");
    }
  };

  useEffect(() => {
    setOpenModal(open);
  }, [open]);

  return (
    <ModalCommon title="เนื้อเพลง" open={openModal} onClose={handleCloseModal}>
      <form onSubmit={handleSubmit}>
        <TextAreaCommon
          className="w-full p-2 border rounded"
          rows={5}
          placeholder="พิมพ์ข้อความที่นี่"
          value={text}
          onChange={handleTextChange}
        ></TextAreaCommon>
        <ButtonCommon
          className="w-full disabled:opacity-50"
          icon={<FaPlus />}
          onClick={handleCloseModal}
          type="submit"
          disabled={isDisabled}
        >
          เพิ่ม
        </ButtonCommon>
      </form>
    </ModalCommon>
  );
};

export default ReadLyricModal;
