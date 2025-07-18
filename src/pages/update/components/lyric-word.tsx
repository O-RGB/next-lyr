import { LyricWordData } from "../lib/type";

type Props = {
  wordData: LyricWordData;
  isActive: boolean; // Timing the current word (Blue)
  isEditing: boolean; // The line is in edit mode (Purple)
  isPlaybackHighlight: boolean; // Word is currently being sung (Gold)
  onClick: (index: number) => void;
  onUpdate: (index: number, newWordData: Partial<LyricWordData>) => void;
  onDelete: (index: number) => void;
};

export default function LyricWord({
  wordData,
  isActive,
  isEditing,
  isPlaybackHighlight, // <-- ADD THIS
  onClick,
}: Props) {
  const isTimed = wordData.start !== null && wordData.end !== null;

  return (
    <div
      className={[
        "lyric-word group relative cursor-pointer rounded-md border px-2.5 py-1.5 text-sm select-none",
        "bg-white border-slate-300 hover:bg-slate-200",

        // [MODIFIED] Added new highlight style with priority
        isPlaybackHighlight && "border-amber-400 bg-amber-200/80",
        isEditing && "border-purple-400 bg-purple-50/80 hover:bg-purple-100",
        isTimed &&
          "border-l-4 border-l-green-500 bg-green-50 hover:bg-green-100",
        isActive &&
          "ring-2 ring-blue-500 scale-105 font-bold bg-blue-100 border-blue-400",
      ].join(" ")}
      data-index={wordData.index}
      onClick={() => onClick(wordData.index)}
    >
      {wordData.name}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-2 py-1 bg-slate-800 text-white text-xs rounded-md whitespace-nowrap z-10">
        {isTimed
          ? `S: ${wordData.start?.toFixed(2)} E: ${wordData.end?.toFixed(2)}`
          : "Not timed"}
      </div>
    </div>
  );
}
