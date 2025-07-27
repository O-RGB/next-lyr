import { useState, useEffect, useRef } from "react";
import InputCommon from "@/components/input/input";

import { LyricWordData } from "@/pages/update/types/type";
import ModalCommon from "../../common/modal";
import ButtonCommon from "../../common/button";
import { FaBackspace, FaSave } from "react-icons/fa";
import { IoArrowBackCircle } from "react-icons/io5";

type Props = {
  open?: boolean;
  lineWords: LyricWordData[];
  onClose: () => void;
  onSave: (newText: string) => void;
};

export default function EditLyricLineModal({
  open,
  lineWords,
  onClose,
  onSave,
}: Props) {
  const initialInputText = lineWords.map((w) => w.name).join("|");

  const [inputText, setInputText] = useState(initialInputText);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = () => {
    if (inputText.trim()) {
      onSave(inputText);
    }
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
        onClose();
        setInputText(initialInputText);
      }}
      open={open ?? false}
      cancelButtonProps={{
        onClick: onClose,
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
