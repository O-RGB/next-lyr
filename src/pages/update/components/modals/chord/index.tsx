import { useState, useEffect, useRef } from "react";
import { ChordEvent } from "../../../modules/midi-klyr-parser/lib/processor";
import ModalCommon from "../../common/modal";
import ButtonCommon from "../../common/button";

type Props = {
  initialChord?: ChordEvent;
  suggestedTick?: number;
  onClose: () => void;
  onSave: (chord: ChordEvent) => void;
  onDelete?: (tick: number) => void;
  open?: boolean;
};

export default function ChordEditModal({
  initialChord,
  suggestedTick,
  onClose,
  onSave,
  onDelete,
  open = false,
}: Props) {
  const [chordText, setChordText] = useState(initialChord?.chord || "");
  const [tickValue, setTickValue] = useState(
    initialChord?.tick !== undefined
      ? initialChord.tick.toString()
      : suggestedTick !== undefined
      ? suggestedTick.toString()
      : "0"
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const isEditing = initialChord !== undefined;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = () => {
    const tick = parseInt(tickValue, 10);
    if (!isNaN(tick) && chordText.trim()) {
      onSave({ chord: chordText.trim(), tick });
    } else {
      alert("Please enter a valid chord text and tick value.");
    }
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
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="chord-text-input"
            className="text-sm font-medium text-slate-600 mb-1 block"
          >
            Chord Text:
          </label>
          <input
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
          <input
            id="tick-value-input"
            type="number"
            value={tickValue}
            onChange={(e) => setTickValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 0, 480, 960"
          />
        </div>
        <div className="flex justify-between gap-3 pt-2">
          {isEditing && onDelete && (
            <ButtonCommon
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </ButtonCommon>
          )}
          <div className="flex gap-3 ml-auto">
            <ButtonCommon onClick={onClose} className="px-4 py-2 bg-slate-200">
              Cancel
            </ButtonCommon>
            <ButtonCommon
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              Save Changes
            </ButtonCommon>
          </div>
        </div>
      </div>
    </ModalCommon>
  );
}
