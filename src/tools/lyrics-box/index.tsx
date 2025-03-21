import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import LyricsBoxRender from "./cards";
import useLyricsStore from "@/stores/lyrics-store";
import InsertLine from "./cards/insert-line";

interface LyricsSectionProps {
  lineCurrent: number;
  wordCurrent: number;
  onLyricsListChange?: (lyrics: string[][]) => void;
  disable?: boolean;
}

const LyricsSection: React.FC<LyricsSectionProps> = ({
  lineCurrent,
  wordCurrent,
  onLyricsListChange,
  disable,
}) => {
  const lyricsCuted = useLyricsStore((state) => state.lyricsCuted);

  const [lyrics, setLyrics] = useState<string[][]>([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const onAddNewLyrics = () => {
    const newLyrics = [...lyrics, []];
    setLyrics(newLyrics);
    onLyricsListChange?.(newLyrics);
  };

  const onAddLyricsIndex = (index: number) => {
    const newLyrics = [...lyrics];
    newLyrics.splice(index, 0, []);
    setLyrics(newLyrics);
    onLyricsListChange?.(newLyrics);
  };

  const onUpdateLyricsIndex = (index: number, list: string[]) => {
    let newLyrics = [...lyrics];
    newLyrics[index] = list;
    setLyrics(newLyrics);
    onLyricsListChange?.(newLyrics);
  };

  const onDeleteLyricsIndex = (index: number) => {
    const newLyrics = [...lyrics];
    newLyrics.splice(index, 1);
    setLyrics(newLyrics);
    onLyricsListChange?.(newLyrics);
  };

  useLayoutEffect(() => {
    const section = document.getElementById(`line-${lineCurrent}`);
    section?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [lineCurrent]);

  useEffect(() => {
    if (lyrics.length === 0) {
      setLyrics(lyricsCuted);
    }
  }, [lyricsCuted]);

  return (
    <div
      ref={scrollContainerRef}
      className="relative row-span-4 rounded overflow-auto"
    >
      <div className="flex flex-col gap-2 h-full p-2">
        {lyrics.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-400"
              >
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
              </svg>
            </div>
            <p className="text-gray-500 text-center mb-4">ยังไม่มีเนื้อเพลง</p>
          </div>
        )}
        {lyrics.map((data, i) => (
          <React.Fragment key={`lyr-box-${i}-${data.length}`}>
            <LyricsBoxRender
              disable={disable}
              onAddLyrics={onAddLyricsIndex}
              onEditLyrics={onUpdateLyricsIndex}
              onDeleteLyricsIndex={onDeleteLyricsIndex}
              lineCurrent={lineCurrent}
              wordCurrent={wordCurrent}
              lyr={data}
              index={i}
            ></LyricsBoxRender>
            {i === lyrics.length - 1 && (
              <InsertLine
                className="pb-2"
                onClick={onAddNewLyrics}
                disabled={disable}
              ></InsertLine>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default LyricsSection;
