import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import LyricsBoxRender from "./cards";
import useLyricsStore from "@/stores/lyrics-store";

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
      <div className="flex flex-col gap-2 h-full border p-2 rounded-md">
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
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default LyricsSection;
