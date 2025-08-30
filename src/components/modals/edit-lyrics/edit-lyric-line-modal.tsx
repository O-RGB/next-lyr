import { useState, useEffect, useRef } from "react";
import ModalCommon from "../../common/modal";
import { FaSave } from "react-icons/fa";
import { LyricWordData } from "@/types/common.type";
import { useKaraokeStore } from "@/stores/karaoke-store";
import InputCommon from "@/components/common/data-input/input";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";

interface EditLyricLineModalProps {
  open?: boolean;
}

export default function EditLyricLineModal({ open }: EditLyricLineModalProps) {
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex);
  const actions = useKaraokeStore((state) => state.actions);
  const handleEditLine = usePlayerHandlersStore(
    (state) => state.handleEditLine
  );

  const [initialInputText, setInitialInputText] = useState<string>();

  const [inputText, setInputText] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && selectedLineIndex !== null && lyricsData[selectedLineIndex]) {
      const lineWord = lyricsData[selectedLineIndex]
        .map((w) => w.name)
        .join("|");
      setInitialInputText(lineWord);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [open, selectedLineIndex, lyricsData]);

  const handleSave = () => {
    if (!inputText) return;
    if (inputText.trim()) {
      if (selectedLineIndex === null) return;
      actions.updateLine(selectedLineIndex, inputText);
      actions.closeEditModal();
      handleEditLine(selectedLineIndex);
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
      cancelButtonProps={{
        onClick: handleClose,
      }}
      okButtonProps={{
        onClick: handleSave,
        children: "Save Changes",
        icon: <FaSave></FaSave>,
      }}
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
