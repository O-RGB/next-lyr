import React, { useEffect, useState } from "react";
import ModalCommon from "../../common/modal";
import ButtonCommon from "../../common/button";
import Upload from "@/components/common/data-input/upload";
import TextareaCommon from "@/components/common/data-input/textarea";
import { BiImport } from "react-icons/bi";
import { BsStars } from "react-icons/bs";
import { FaFile } from "react-icons/fa";
import { useKaraokeStore } from "../../../stores/karaoke-store";
import { IoArrowBackCircle } from "react-icons/io5";
import { readLyricsFile } from "@/lib/karaoke/ncn";
import { tokenizeThai } from "@/lib/wordcut/utils";

interface ReadLyricsModalProps {
  open?: boolean;
  onClose?: () => void;
}

const ReadLyricsModal: React.FC<ReadLyricsModalProps> = ({ open, onClose }) => {
  const exText = "ตัว|อย่าง|เนื้อ|เพลง\nของ|คุณ";
  const actions = useKaraokeStore((state) => state.actions);
  const [lyricsText, setLyricsText] = useState<string>(exText);
  const [openModal, setOpenModal] = useState<boolean>(false);

  const handleCloseModal = () => {
    setOpenModal(false);
    onClose?.();
    setLyricsText(exText);
  };

  const handleAutoCut = async () => {
    const processedText = await tokenizeThai(lyricsText);
    setLyricsText(processedText);
  };

  const onTextChange = async (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setLyricsText(value);
  };

  const onAddLyrFile = async (file: File) => {
    const lyrDecoded = await readLyricsFile(file);
    if (lyrDecoded.length <= 4) return;
    const cut = lyrDecoded.splice(4, lyrDecoded.length);
    const lyrjoin = cut.join("\n");

    setLyricsText(lyrjoin);
  };

  const handleOnAdd = async () => {
    if (lyricsText.length > 0) {
      actions.importLyrics(lyricsText);
    }
    onClose?.();
  };

  useEffect(() => {
    setOpenModal(open ?? false);
  }, [open]);

  return (
    <>
      <ModalCommon
        modalId="read-lyrics"
        title="เลือกเพลง"
        open={openModal}
        onClose={handleCloseModal}
        footer={
          <div className="flex gap-2 flex-wrap lg:flex-row items-center justify-end">
            <ButtonCommon
              size="sm"
              onClick={onClose}
              icon={<IoArrowBackCircle />}
              color="gray"
              className="text-nowrap"
            >
              Close
            </ButtonCommon>
            <ButtonCommon
              size="sm"
              onClick={handleAutoCut}
              disabled={lyricsText.length <= 0}
              icon={<BsStars />}
              color="success"
              className="text-nowrap"
            >
              ตัดคำอัตโนมัติ
            </ButtonCommon>
            <Upload
              className="text-nowrap"
              multiple={false}
              preview={false}
              onChange={(files) => {
                const [file] = files;
                if (!file) return;
                onAddLyrFile(file);
              }}
              customNode={
                <ButtonCommon
                  size="sm"
                  className="text-nowrap"
                  icon={<FaFile />}
                  color="secondary"
                >
                  อ่านไฟล์ (.lyr)
                </ButtonCommon>
              }
            />
            <ButtonCommon
              size="sm"
              className="text-nowrap"
              onClick={handleOnAdd}
              icon={<BiImport />}
            >
              นำเข้า
            </ButtonCommon>
          </div>
        }
      >
        <TextareaCommon
          value={lyricsText}
          onChange={onTextChange}
          className="!h-[300px] lg:!h-[400px]"
        />
      </ModalCommon>
    </>
  );
};

export default ReadLyricsModal;
