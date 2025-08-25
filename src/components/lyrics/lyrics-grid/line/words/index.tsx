// src/components/lyrics/lyrics-grid/line/words/index.tsx

import { LyricWordData } from "@/types/common.type";
import Word from "./word";
import React, { useRef } from "react";

interface LyricsWordsProps {
  line: LyricWordData[];
  lineIndex: number;
  onWordClick: (index: number) => void;
  isSelected: boolean;
}

const LyricsWords: React.FC<LyricsWordsProps> = ({
  line,
  lineIndex,
  onWordClick,
  isSelected,
}) => {
  const wordRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const containerRef = useRef<HTMLDivElement | null>(null);

  const scrollToActiveWord = (
    wordIndex: number,
    align: ScrollLogicalPosition = "center"
  ) => {
    const activeWordElement = wordRefs.current[wordIndex];

    if (activeWordElement) {
      activeWordElement.scrollIntoView({
        behavior: "instant",
        inline: align,
        block: "center",
      });
    }
  };

  const handleWordSelect = (index: number) => {
    scrollToActiveWord(index);
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 min-w-0 flex flex-nowrap gap-2 overflow-x-auto lg:pb-2 w-full [&::-webkit-scrollbar]:hidden p-1"
    >
      {line.map((word) => (
        <Word
          ref={(el: any) => (wordRefs.current[word.index] = el)}
          key={word.index}
          lineIndex={lineIndex}
          wordData={word}
          onSelect={handleWordSelect}
          onActiveLine={(is, line) => {
            if (is === false && containerRef.current) {
              containerRef.current.scrollTo({ left: 0, behavior: "instant" });
            }
          }}
          onClick={onWordClick}
          onUpdate={() => {}}
          onDelete={() => {}}
          isCurrentLine={isSelected}
        />
      ))}
    </div>
  );
};

export default LyricsWords;
