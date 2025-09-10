import { useState, useEffect, useRef } from "react";
import ModalCommon from "../../common/modal";
import { FaEdit, FaPlus, FaSave } from "react-icons/fa";
import { useKaraokeStore } from "@/stores/karaoke-store";
import InputCommon from "@/components/common/data-input/input";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import ButtonCommon from "@/components/common/button";
import { IoArrowBackCircle } from "react-icons/io5";
import { BsStars } from "react-icons/bs";
import { tokenizeThai } from "@/lib/wordcut/utils";

interface EditLyricLineModalProps {
  open?: boolean;
}

export default function EditLyricLineModal({ open }: EditLyricLineModalProps) {
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex);
  const actions = useKaraokeStore((state) => state.actions);
  const { handleRetiming } = usePlayerHandlersStore();

  const [initialInputText, setInitialInputText] = useState<string>("");

  const [inputText, setInputText] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && selectedLineIndex !== null && lyricsData[selectedLineIndex]) {
      const lineWord = lyricsData[selectedLineIndex]
        .map((w) => w.name)
        .join("|");
      setInitialInputText(lineWord);
      setInputText(lineWord);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [open, selectedLineIndex, lyricsData]);

  const handleSave = () => {
    if (inputText && inputText.trim() && selectedLineIndex !== null) {
      actions.updateLine(selectedLineIndex, inputText);
      actions.closeEditModal();
      handleRetiming(selectedLineIndex, selectedLineIndex);
    }
  };

  const handleClose = () => {
    actions.closeEditModal();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  const cutText = async () => {
    const processedText = await tokenizeThai(inputText);
    setInputText(processedText);
  };

  useEffect(() => {
    setInputText(initialInputText);
  }, [initialInputText]);

  return (
    <ModalCommon
      modalId="edit-lyrics"
      title="Edit Lyric Line"
      onClose={() => {
        setInputText(initialInputText);
        handleClose();
      }}
      open={(open ?? false) && selectedLineIndex !== null}
      footer={
        <div className="flex items-center justify-end gap-3">
          <ButtonCommon
            size="sm"
            color="gray"
            icon={<IoArrowBackCircle />}
            onClick={handleClose}
          >
            Close
          </ButtonCommon>
          <ButtonCommon
            size="sm"
            disabled={inputText.length <= 0}
            icon={<BsStars />}
            color="success"
            className="text-nowrap"
            onClick={cutText}
          >
            ตัดคำ
          </ButtonCommon>
          <ButtonCommon
            onClick={handleSave}
            color="primary"
            size="sm"
            icon={<FaEdit></FaEdit>}
          >
            Edit
          </ButtonCommon>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="edit-line-input"
            className="text-sm font-medium text-slate-600 mb-1 block"
          >
            Edit (use | to separate words):
          </label>
          <InputCommon
            id="edit-line-input"
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
    </ModalCommon>
  );
}
