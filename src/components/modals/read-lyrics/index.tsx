import React, { useEffect, useState } from "react";
import ModalCommon from "../../common/modal";
import ButtonCommon from "../../common/button";
import Upload from "@/components/common/data-input/upload";
import TextareaCommon from "@/components/common/data-input/textarea";
import { loadWords } from "@/lib/wordcut";
import { BiImport } from "react-icons/bi";
import { BsStars } from "react-icons/bs";
import { FaFile } from "react-icons/fa";
import { useKaraokeStore } from "../../../stores/karaoke-store";
import { IoArrowBackCircle } from "react-icons/io5";
import { readLyricsFile } from "@/lib/karaoke/ncn";

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

  const autoCut = async () => {
    const segmenter = await loadWords();
    const lines = lyricsText.split("\n");

    const processedLines = lines.map((line) => {
      const preProcessedLine = line
        .replaceAll("|", " ")
        .replace(/([\u0e00-\u0e7f])([a-zA-Z'’])/g, "$1 $2")
        .replace(/([a-zA-Z'’])([\u0e00-\u0e7f])/g, "$1 $2")
        .replace(/\s+/g, " ")
        .trim();

      const segmentedParts = segmenter.segmentText(preProcessedLine);
      const allWords = segmentedParts
        .flatMap((part) => part.split(/\s+/))
        .filter(Boolean);

      if (allWords.length === 0) return "";

      let result = allWords[0];
      for (let i = 1; i < allWords.length; i++) {
        const prevWord = allWords[i - 1];
        const currentWord = allWords[i];

        const isPrevEnglish = /^[a-zA-Z'’]/.test(prevWord);
        const isCurrentEnglish = /^[a-zA-Z'’]/.test(currentWord);

        if (isPrevEnglish || isCurrentEnglish) {
          result += " | " + currentWord;
        } else {
          result += "|" + currentWord;
        }
      }
      return result;
    });

    setLyricsText(processedLines.join("\n"));
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
              icon={<IoArrowBackCircle></IoArrowBackCircle>}
              color="gray"
              className="text-nowrap"
            >
              Close
            </ButtonCommon>
            <ButtonCommon
              size="sm"
              onClick={autoCut}
              disabled={lyricsText.length <= 0}
              icon={<BsStars></BsStars>}
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
                  icon={<FaFile></FaFile>}
                  color="secondary"
                >
                  อ่านไฟล์​ (.lyr)
                </ButtonCommon>
              }
            ></Upload>
            <ButtonCommon
              size="sm"
              className="text-nowrap"
              onClick={handleOnAdd}
              icon={<BiImport></BiImport>}
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
        ></TextareaCommon>
      </ModalCommon>
    </>
  );
};

export default ReadLyricsModal;
