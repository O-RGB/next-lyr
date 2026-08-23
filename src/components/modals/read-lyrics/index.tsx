import {
  Captions,
  File,
  Import,
  Sparkles,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import ModalCommon from "../../common/modal";
import ButtonCommon from "../../common/button";
import Upload from "@/components/common/data-input/upload";
import LyricsTextEditor from "@/components/common/data-input/lyrics-text-editor";
import { useKaraokeStore } from "../../../stores/karaoke-store";
import { readLyricsFile } from "@/lib/karaoke/ncn";
import { tokenizeThai } from "@/lib/wordcut/utils";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";

interface ReadLyricsModalProps {
  open?: boolean;
  onClose?: () => void;
}

const THAI_EXAMPLE = "ตัว|อย่าง|เนื้อ|เพลง\nของ|คุณ";
const ENGLISH_EXAMPLE = "Example|lyrics\nfor|you";
const LYRICS_DRAFT_VERSION = 2;

function migrateLegacySpaceEncoding(value: string) {
  return value.replace(/ {2,}/g, (run) => " ".repeat(Math.ceil(run.length / 2)));
}

const ReadLyricsModal: React.FC<ReadLyricsModalProps> = ({ open, onClose }) => {
  const actions = useKaraokeStore((state) => state.actions);
  const projectId = useKaraokeStore((state) => state.projectId);
  const locale = useSettingsStore((state) => state.uiLocale);
  const exampleLyrics = text(locale, THAI_EXAMPLE, ENGLISH_EXAMPLE);
  const previousExampleRef = useRef(exampleLyrics);
  const draftKey = `next-lyrics-editor:add-lyrics-draft:${projectId ?? "new"}`;
  const [draftReadyKey, setDraftReadyKey] = useState<string | null>(null);
  const [lyricsText, setLyricsText] = useState<string>(exampleLyrics);

  const [isOpenSub, setOpenSub] = useState<boolean>(false);
  const [openModal, setOpenModal] = useState<boolean>(false);

  useEffect(() => {
    if (draftReadyKey !== draftKey) return;

    setLyricsText((current) =>
      current === previousExampleRef.current ? exampleLyrics : current
    );
    previousExampleRef.current = exampleLyrics;
  }, [draftKey, draftReadyKey, exampleLyrics]);

  useEffect(() => {
    setDraftReadyKey(null);
    let nextLyricsText = exampleLyrics;
    let nextIsOpenSub = false;

    try {
      const storedDraft = window.localStorage.getItem(draftKey);
      if (storedDraft) {
        const parsedDraft: unknown = JSON.parse(storedDraft);
        if (typeof parsedDraft === "object" && parsedDraft !== null) {
          const draft = parsedDraft as {
            version?: unknown;
            lyricsText?: unknown;
            isOpenSub?: unknown;
          };
          if (typeof draft.lyricsText === "string") {
            nextLyricsText =
              draft.version === LYRICS_DRAFT_VERSION
                ? draft.lyricsText
                : migrateLegacySpaceEncoding(draft.lyricsText);
          }
          if (typeof draft.isOpenSub === "boolean") {
            nextIsOpenSub = draft.isOpenSub;
          }
        }
      }
    } catch (error) {
      console.warn("Could not restore lyrics draft:", error);
    }

    setLyricsText(nextLyricsText);
    setOpenSub(nextIsOpenSub);
    setDraftReadyKey(draftKey);
  }, [draftKey, exampleLyrics]);

  useEffect(() => {
    if (draftReadyKey !== draftKey) return;

    try {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({
          version: LYRICS_DRAFT_VERSION,
          lyricsText,
          isOpenSub,
        })
      );
    } catch (error) {
      console.warn("Could not save lyrics draft:", error);
    }
  }, [draftKey, draftReadyKey, isOpenSub, lyricsText]);

  const handleCloseModal = () => {
    setOpenModal(false);
    onClose?.();
  };

  const handleAutoCut = async () => {
    const processedText = await tokenizeThai(lyricsText);
    setLyricsText(processedText);
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
        modalClassName="h-[86dvh] sm:h-[min(92dvh,760px)]"
        bodyClassName="flex h-full min-h-0 flex-col overflow-hidden p-0"
        footer={null}
      >
        <div className="mb-2 flex w-full min-w-0 shrink-0 flex-nowrap items-center gap-1 overflow-x-auto rounded-md border border-line bg-raised p-1 sm:gap-2">
          <ButtonCommon
            size="xs"
            onClick={handleAutoCut}
            disabled={lyricsText.length <= 0}
            icon={<Sparkles />}
            color="success"
            className="shrink-0 text-nowrap px-2"
          >
            {text(locale, "ตัดคำ", "Auto split")}
          </ButtonCommon>
          <Upload
            className="shrink-0 text-nowrap"
            multiple={false}
            preview={false}
            onChange={(files) => {
              const [file] = files;
              if (!file) return;
              onAddLyrFile(file);
            }}
            customNode={
              <ButtonCommon
                size="xs"
                className="shrink-0 text-nowrap px-2"
                icon={<File />}
                color="secondary"
              >
                {text(locale, "อ่าน .lyr", "Read .lyr")}
              </ButtonCommon>
            }
          />
          <ButtonCommon
            size="xs"
            onClick={() => setOpenSub((current) => !current)}
            icon={<Captions />}
            color={isOpenSub ? "success" : "gray"}
            variant={isOpenSub ? "solid" : "outline"}
            aria-pressed={isOpenSub}
            className="shrink-0 text-nowrap px-2"
          >
            {text(locale, "ซับอัตโนมัติ", "Auto sub")}
          </ButtonCommon>
          <ButtonCommon
            size="xs"
            className="shrink-0 text-nowrap px-2"
            onClick={handleOnAdd}
            icon={<Import />}
          >
            {text(locale, "นำเข้า", "Import")}
          </ButtonCommon>
        </div>
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-line bg-raised p-2">
          <LyricsTextEditor
            value={lyricsText}
            onChange={setLyricsText}
            resetKey={openModal}
            fitToContainer
            label={text(locale, "เนื้อเพลง", "Lyrics")}
            deleteLabel={text(locale, "ลบ", "Delete")}
            placeholder={text(locale, "พิมพ์เนื้อเพลงที่นี่", "Type lyrics here")}
          />
        </div>
      </ModalCommon>
    </>
  );
};

export default ReadLyricsModal;
