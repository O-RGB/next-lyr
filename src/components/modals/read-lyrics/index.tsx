import { CircleArrowLeft, File, Import, Sparkles } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import ModalCommon from "../../common/modal";
import ButtonCommon from "../../common/button";
import Upload from "@/components/common/data-input/upload";
import TextareaCommon from "@/components/common/data-input/textarea";
import { useKaraokeStore } from "../../../stores/karaoke-store";
import { readLyricsFile } from "@/lib/karaoke/ncn";
import { tokenizeThai } from "@/lib/wordcut/utils";
import CheckboxGroup from "@/components/common/data-input/checkbox";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";

interface ReadLyricsModalProps {
  open?: boolean;
  onClose?: () => void;
}

const THAI_EXAMPLE = "ตัว|อย่าง|เนื้อ|เพลง\nของ|คุณ";
const ENGLISH_EXAMPLE = "Example|lyrics\nfor|you";

const ReadLyricsModal: React.FC<ReadLyricsModalProps> = ({ open, onClose }) => {
  const actions = useKaraokeStore((state) => state.actions);
  const locale = useSettingsStore((state) => state.uiLocale);
  const exampleLyrics = text(locale, THAI_EXAMPLE, ENGLISH_EXAMPLE);
  const previousExampleRef = useRef(exampleLyrics);
  const [lyricsText, setLyricsText] = useState<string>(exampleLyrics);

  const [isOpenSub, setOpenSub] = useState<boolean>(false);
  const [openModal, setOpenModal] = useState<boolean>(false);

  useEffect(() => {
    setLyricsText((current) =>
      current === previousExampleRef.current ? exampleLyrics : current
    );
    previousExampleRef.current = exampleLyrics;
  }, [exampleLyrics]);

  const handleCloseModal = () => {
    setOpenModal(false);
    onClose?.();
    setLyricsText(exampleLyrics);
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
      actions.importLyrics(lyricsText, isOpenSub);
    }
    onClose?.();
  };

  useEffect(() => {
    setOpenModal(open ?? false);
  }, [open]);

  return (
    <>
      <ModalCommon
        title={text(locale, "เพิ่มเนื้อเพลง", "Add lyrics")}
        open={openModal}
        onClose={handleCloseModal}
        footer={
          <div className="flex gap-2 flex-wrap lg:flex-row items-center justify-end">
            <ButtonCommon
              size="sm"
              onClick={handleCloseModal}
              icon={<CircleArrowLeft />}
              color="gray"
              className="text-nowrap"
            >
              {text(locale, "ปิด", "Close")}
            </ButtonCommon>
            <ButtonCommon
              size="sm"
              onClick={handleAutoCut}
              disabled={lyricsText.length <= 0}
              icon={<Sparkles />}
              color="success"
              className="text-nowrap"
            >
              {text(locale, "ตัดคำอัตโนมัติ", "Auto-split words")}
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
                  icon={<File />}
                  color="secondary"
                >
                  {text(locale, "อ่านไฟล์ (.lyr)", "Read .lyr file")}
                </ButtonCommon>
              }
            />
            <ButtonCommon
              size="sm"
              className="text-nowrap"
              onClick={handleOnAdd}
              icon={<Import />}
            >
              {text(locale, "นำเข้า", "Import")}
            </ButtonCommon>
          </div>
        }
      >
        <div className="p-2 border rounded-md mb-2 bg-raised">
          <label className="text-xs font-medium text-foreground mb-1 block">
            {text(locale, "เพิ่มเติม", "Additional options")}
          </label>
          <CheckboxGroup
            onChange={(values) => {
              const isCheck = values.find((x) => "sub-eng");
              if (isCheck) setOpenSub(true);
              else setOpenSub(false);
            }}
            options={[
              {
                label: text(locale, "เพิ่มซับไตเติ้ล Eng (ภาษาไทยเท่านั้น)", "Add English subtitles (Thai lyrics only)"),
                value: "sub-eng",
              },
            ]}
          ></CheckboxGroup>
        </div>
        <div className="p-2 border rounded-md bg-raised">
          <label className="text-xs font-medium text-foreground mb-1 block">
            {text(locale, "เนื้อเพลง", "Lyrics")}
          </label>
          <TextareaCommon
            value={lyricsText}
            onChange={onTextChange}
            className="!h-[300px] lg:!h-[400px]"
          />
        </div>
      </ModalCommon>
    </>
  );
};

export default ReadLyricsModal;
