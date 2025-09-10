import { useState, useEffect, useRef } from "react";
import ModalCommon from "../../common/modal";
import { FaPlus, FaSave } from "react-icons/fa";
import { useKaraokeStore } from "@/stores/karaoke-store";
import InputCommon from "@/components/common/data-input/input";
import ButtonCommon from "@/components/common/button";
import { tokenizeThai } from "@/lib/wordcut/utils";
import { BsStars } from "react-icons/bs";
import { IoArrowBackCircle } from "react-icons/io5";

interface AddLyricLineModalProps {
  open?: boolean;
}

export default function AddLyricLineModal({ open }: AddLyricLineModalProps) {
  const lineIndexToInsertAfter = useKaraokeStore(
    (state) => state.lineIndexToInsertAfter
  );
  const actions = useKaraokeStore((state) => state.actions);
  const [inputText, setInputText] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setInputText("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSave = () => {
    if (inputText.trim() && lineIndexToInsertAfter !== null) {
      actions.insertLineAfter(lineIndexToInsertAfter, inputText);
      actions.closeAddModal();
    }
  };

  const handleClose = () => {
    actions.closeAddModal();
  };

  const cutText = async () => {
    const processedText = await tokenizeThai(inputText);
    setInputText(processedText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <ModalCommon
      modalId="add-lyrics"
      title={`Add Lyric Line After Line ${
        lineIndexToInsertAfter !== null ? lineIndexToInsertAfter + 1 : ""
      }`}
      onClose={handleClose}
      open={open || lineIndexToInsertAfter !== null}
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
          <ButtonCommon color="primary" size="sm" icon={<FaPlus></FaPlus>}>
            Add
          </ButtonCommon>
        </div>
      }
      // cancelButtonProps={{
      //   onClick: handleClose,
      // }}
      // okButtonProps={{
      //   onClick: handleSave,
      //   children: "Add Line",
      //   icon: <FaSave />,
      // }}
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="add-line-input"
            className="text-sm font-medium text-slate-600 mb-1 block"
          >
            New line (use | to separate words):
          </label>

          <InputCommon
            id="add-line-input"
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter new lyrics here..."
          />
        </div>
      </div>
    </ModalCommon>
  );
}
