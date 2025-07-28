// update/components/modals/chord/index.tsx
import { useState, useEffect, useRef } from "react";
import { ChordEvent } from "../../../modules/midi-klyr-parser/lib/processor";
import ModalCommon from "../../common/modal";
import ButtonCommon from "../../common/button";
import InputCommon from "@/components/common/data-input/input";
import InputNumberCommon from "@/components/common/data-input/input-number";
import { FaSave } from "react-icons/fa";
import { IoArrowBackCircle } from "react-icons/io5";
import { MdDelete } from "react-icons/md";

type Props = {
  initialChord?: ChordEvent;
  suggestedTick?: number;
  onClose: () => void;
  onSave: (chord: ChordEvent) => void;
  onDelete?: (tick: number) => void;
  open?: boolean;
  minTick?: number;
  maxTick?: number;
};

export default function ChordEditModal({
  initialChord,
  suggestedTick,
  onClose,
  onSave,
  onDelete,
  open = false,
  minTick,
  maxTick,
}: Props) {
  const [chordText, setChordText] = useState("");
  const [tickValue, setTickValue] = useState("0");
  const inputRef = useRef<HTMLInputElement>(null);

  const isEditing = initialChord !== undefined;

  useEffect(() => {
    // Update state when modal opens or initialChord/suggestedTick changes
    if (open) {
      if (initialChord) {
        setChordText(initialChord.chord);
        setTickValue(initialChord.tick.toString());
      } else if (suggestedTick !== undefined) {
        setChordText(""); // Clear chord text for new chord
        setTickValue(suggestedTick.toString());
      } else {
        setChordText("");
        setTickValue("0"); // Default for new chord if no suggestion
      }
      inputRef.current?.focus();
    }
  }, [open, initialChord, suggestedTick]); // Depend on open, initialChord, and suggestedTick

  const handleSave = () => {
    const tick = parseInt(tickValue, 10);
    if (isNaN(tick) || !chordText.trim()) {
      alert("Please enter a valid chord text and tick value.");
      return;
    }

    if (minTick !== undefined && tick < minTick) {
      alert(`Chord tick cannot be before the line's start time (${minTick}).`);
      return;
    }
    if (maxTick !== undefined && tick > maxTick) {
      alert(`Chord tick cannot be after the line's end time (${maxTick}).`);
      return;
    }

    onSave({ chord: chordText.trim(), tick });
  };

  const handleTickChange = (tick: number | undefined) => {
    let num = tick ?? 0;
    if (isNaN(num)) return;

    if (minTick !== undefined && num < minTick) {
      num = minTick;
    }
    if (maxTick !== undefined && num > maxTick) {
      num = maxTick;
    }

    setTickValue(num.toString());
  };

  const handleDelete = () => {
    if (
      initialChord &&
      onDelete &&
      confirm("Are you sure you want to delete this chord?")
    ) {
      onDelete(initialChord.tick);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <ModalCommon
      title={isEditing ? "Edit Chord" : "Add New Chord"}
      onClose={onClose}
      open={open}
      footer={
        <div className="flex justify-between gap-3 pt-2">
          {isEditing && onDelete && (
            <ButtonCommon onClick={handleDelete} color="danger" icon={<MdDelete></MdDelete>}>
              Delete
            </ButtonCommon>
          )}
          <div className="flex gap-3 ml-auto">
            <ButtonCommon onClick={onClose} color="gray"  icon={<IoArrowBackCircle />}>
              Cancel
            </ButtonCommon>
            <ButtonCommon onClick={handleSave} color="primary" icon={<FaSave></FaSave>}>
              Save Changes
            </ButtonCommon>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="chord-text-input"
            className="text-sm font-medium text-slate-600 mb-1 block"
          >
            Chord Text:
          </label>
          <InputCommon
            id="chord-text-input"
            ref={inputRef}
            type="text"
            value={chordText}
            onChange={(e) => setChordText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., C, Am7, G/B"
          />
        </div>
        <div>
          <label
            htmlFor="tick-value-input"
            className="text-sm font-medium text-slate-600 mb-1 block"
          >
            Tick Position:
          </label>
          <InputNumberCommon
            id="tick-value-input"
            value={tickValue}
            min={minTick}
            max={maxTick}
            onChange={handleTickChange}
            onKeyDown={handleKeyDown}
            placeholder="e.g., 0, 480, 960"
          />
          {(minTick !== undefined || maxTick !== undefined) && (
            <p className="text-xs text-slate-500 mt-1">
              {minTick !== undefined && maxTick !== undefined
                ? `Range: ${minTick} - ${maxTick}`
                : minTick !== undefined
                ? `Min: ${minTick}`
                : `Max: ${maxTick}`}
            </p>
          )}
        </div>
      </div>
    </ModalCommon>
  );
}
