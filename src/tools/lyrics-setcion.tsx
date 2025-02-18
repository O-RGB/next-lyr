import React, { useEffect, useRef, useState } from "react";
import LyricsBoxList from "@/components/lyrics/lyrics-list";

interface LyricsSectionProps {
  segmentedText: string[][];
  lineCurrent: number;
  wordCurrent: number;
  onLyricsListChange?: (lyrics: string[][]) => void;
}

const LyricsSection: React.FC<LyricsSectionProps> = ({
  segmentedText,
  lineCurrent,
  wordCurrent,
  onLyricsListChange,
}) => {
  const [lyrics, setLyrics] = useState<string[][]>([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const section = document.getElementById(`line-${lineCurrent}`);
    section?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [lineCurrent]);

  useEffect(() => {
    if (lyrics.length === 0) {
      setLyrics(segmentedText);
    }
  }, [segmentedText]);
  return (
    <div
      ref={scrollContainerRef}
      className="relative row-span-4 rounded overflow-auto"
    >
      <div className="flex flex-col gap-2 h-full border p-2">
        {lyrics?.map((data, i) => (
          <div
            id={`line-${i}`}
            key={`res-${i}`}
            className={`p-2 rounded-md bg-white flex gap-2 w-full h-full ${
              lineCurrent === i ? "outline outline-red-500" : ""
            }`}
          >
            <div className="flex h-full w-10 bg-slate-600 rounded-md">
              <div className="text-sm m-auto text-white">{i + 1}</div>
            </div>
            <LyricsBoxList
              isLineActive={lineCurrent === i}
              wordIndex={wordCurrent}
              list={data}
              onSaveList={(lyr) => {
                let clone = [...lyrics];
                clone[i] = lyr;
                setLyrics(clone);
                onLyricsListChange?.(clone);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LyricsSection;
