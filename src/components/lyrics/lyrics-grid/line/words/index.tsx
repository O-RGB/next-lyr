import { LyricWordData } from "@/types/common.type";
import Word from "./word";
import React, { useRef } from "react";
import LineScroller from "./LineScroller";

interface LyricsWordsProps {
  line: LyricWordData[];
  onWordClick: (index: number) => void;
}

const LyricsWords: React.FC<LyricsWordsProps> = ({ line, onWordClick }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lineIndex = line[0]?.lineIndex ?? null;

  return (
    <div
      ref={containerRef}
      className="flex-1 min-w-0 flex flex-nowrap gap-1 lg:gap-2 overflow-x-auto w-full [&::-webkit-scrollbar]:hidden p-1"
    >
      {line.map((word) => (
        <Word key={word.index} wordData={word} onClick={onWordClick} />
      ))}
      {lineIndex !== null && (
        <LineScroller containerRef={containerRef} lineIndex={lineIndex} />
      )}
    </div>
  );
};

export default LyricsWords;
