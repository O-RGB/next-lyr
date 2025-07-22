import { LyricWordData } from "../../types/type";

type Props = {
  wordData: LyricWordData;
  isActive: boolean;
  isEditing: boolean;
  isPlaybackHighlight: boolean;
  isPendingCorrection: boolean;
  onClick: (index: number) => void;
  onUpdate: (index: number, newWordData: Partial<LyricWordData>) => void;
  onDelete: (index: number) => void;
};

export default function LyricWord({
  wordData,
  isActive,
  isEditing,
  isPlaybackHighlight,
  isPendingCorrection,
  onClick,
}: Props) {
  const isTimed = wordData.start !== null;

  const formatTimeValue = (value: number | null) => {
    if (value === null) return "N/A";
    return value > 1000 ? Math.round(value) : value.toFixed(2);
  };

  return (
    <div
      className={[
        "lyric-word group relative cursor-pointer rounded-md border px-2.5 py-1.5 pr-4 text-sm select-none text-nowrap",
        "bg-white border-slate-300 hover:bg-slate-200",
        isPlaybackHighlight && "!border-amber-400 !bg-amber-200/80",
        isEditing &&
          "border-purple-400 bg-purple-50/80 hover:bg-purple-100 transition-all duration-150",
        isPendingCorrection &&
          "ring-2 ring-orange-500 font-bold bg-orange-100 border-orange-400 transition-all duration-150",
        isTimed &&
          !isPendingCorrection &&
          "border-l-4 border-l-green-500 bg-green-50 hover:bg-green-100 transition-all duration-150",
        isActive &&
          "ring-2 ring-blue-500 scale-105 font-bold bg-blue-100 border-blue-400 transition-all duration-150",
      ].join(" ")}
      data-index={wordData.index}
      onClick={() => onClick(wordData.index)}
    >
      {wordData.name}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-2 py-1 bg-slate-800 text-white text-xs rounded-md whitespace-nowrap z-10">
        {isTimed
          ? `S: ${formatTimeValue(wordData.start)} E: ${formatTimeValue(
              wordData.end
            )}`
          : "Not timed"}
      </div>
    </div>
  );
}
