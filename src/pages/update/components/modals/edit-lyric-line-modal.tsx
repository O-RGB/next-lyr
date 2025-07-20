import { useState, useEffect, useRef } from "react";
import { Modal } from "../common/modal";
import { Button } from "../common/button";
import { LyricWordData } from "../../types/type";

type Props = {
  lineWords: LyricWordData[];
  onClose: () => void;
  onSave: (newText: string) => void;
};

export default function EditLyricLineModal({
  lineWords,
  onClose,
  onSave,
}: Props) {
  const originalText = lineWords.map((w) => w.name).join(" ");
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

  return (
    <Modal title="Edit Lyric Line" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-slate-600 mb-1">
            Original Line:
          </p>
          <p className="p-3 bg-slate-200 rounded-md text-slate-800">
            {originalText}
          </p>
        </div>
        <div>
          <label
            htmlFor="edit-line-input"
            className="text-sm font-medium text-slate-600 mb-1 block"
          >
            Edit (use | to separate words):
          </label>
          <input
            id="edit-line-input"
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button onClick={onClose} className="px-4 py-2 bg-slate-200">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
