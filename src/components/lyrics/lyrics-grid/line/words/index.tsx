import { LyricWordData } from "@/types/common.type";
import Word from "./word";
import React, { useRef } from "react";

interface LyricsWordsProps {
  line: LyricWordData[];
  lineIndex: number;
  onWordClick: (index: number) => void;
}

const LyricsWords: React.FC<LyricsWordsProps> = ({
  line,
  lineIndex,
  onWordClick,
}) => {
  const wordRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const scrollToActiveWord = (wordIndex: number) => {
    const activeWordElement = wordRefs.current[wordIndex];

    if (activeWordElement) {
      activeWordElement.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "center",
      });
    }
  };

  const handleWordSelect = (index: number) => {
    scrollToActiveWord(index);
  };

  return (
    <div className="flex-1 min-w-0 flex flex-nowrap gap-2 overflow-x-auto pb-2 w-full [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-slate-100 p-1">
      {line.map((word) => (
        <Word
          ref={(el: any) => (wordRefs.current[word.index] = el)}
          key={word.index}
          lineIndex={lineIndex}
          wordData={word}
          onSelect={handleWordSelect}
          onClick={onWordClick}
          onUpdate={() => {}}
          onDelete={() => {}}
        />
      ))}
    </div>
  );
};

export default LyricsWords;
