import TextAreaCommon from "@/components/textarea";
import { loadWords } from "@/lib/wordcut";
import React, { useEffect, useState } from "react";
import { BiImport } from "react-icons/bi";
import { BsStars } from "react-icons/bs";
import { FaFile } from "react-icons/fa";
import { useKaraokeStore } from "../../../store/useKaraokeStore";
import ModalCommon from "../../common/modal";
import ButtonCommon from "../../common/button";
import Upload from "@/components/upload";
import { IoArrowBackCircle } from "react-icons/io5";
import { readLyricsFile } from "@/lib/karaoke/ncn";

interface ReadLyricsModalProps {
  open?: boolean;
  onClose?: () => void;
}

const ReadLyricsModal: React.FC<ReadLyricsModalProps> = ({ open, onClose }) => {
  const exText = "ตัว|อย่าง|เนื้อ|เพลง\nของ|คุณ";
  const { actions } = useKaraokeStore();
  const [lyricsText, setLyricsText] = useState<string>(exText);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const handleCloseModal = () => {
    setOpenModal(false);
    onClose?.();
    setLyricsText(exText);
  };

  const autoCut = async () => {
    const test = await loadWords();
    const splitText = lyricsText.split("\n");
    const segment = splitText.map((v) =>
      test.segmentText(v.replaceAll("|", " "))
    );
    const st = segment.map((b) => b.join("|"));
    setLyricsText(st.join("\n"));
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
          <div className="flex gap-2 flex-col lg:flex-row items-center justify-end">
            <ButtonCommon
              onClick={onClose}
              icon={<IoArrowBackCircle></IoArrowBackCircle>}
              color="gray"
              className="w-full lg:w-auto"
            >
              Close
            </ButtonCommon>
            <ButtonCommon
              onClick={autoCut}
              disabled={lyricsText.length <= 0}
              icon={<BsStars></BsStars>}
              color="success"
              className="w-full lg:w-auto"
            >
              ตัดคำอัตโนมัติ
            </ButtonCommon>
            <Upload
              className="w-full lg:w-auto"
              multiple={false}
              preview={false}
              onChange={(files) => {
                const [file] = files;
                if (!file) return;
                onAddLyrFile(file);
              }}
              customNode={
                <ButtonCommon
                  className="w-full lg:w-autotext-nowrap"
                  icon={<FaFile></FaFile>}
                  color="secondary"
                >
                  อ่านไฟล์​ (.lyr)
                </ButtonCommon>
              }
            ></Upload>
            <ButtonCommon
              className="w-full lg:w-auto"
              onClick={handleOnAdd}
              icon={<BiImport></BiImport>}
            >
              นำเข้า
            </ButtonCommon>
          </div>
        }
      >
        <TextAreaCommon
          value={lyricsText}
          onChange={onTextChange}
          className="h-[300px] lg:h-[400px]"
        ></TextAreaCommon>
      </ModalCommon>
    </>
  );
};

export default ReadLyricsModal;
