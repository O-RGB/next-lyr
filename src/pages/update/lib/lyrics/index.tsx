import React, { useEffect, useMemo } from "react";
import { LyricsRangeArray } from "./lyrics-mapping";
import { ISentence } from "./types";
import LyricsList from "./lyrics-ui";

interface LyricsPlayerProps {
  currentTick: number;
  lyricsProcessed: LyricsRangeArray<ISentence>;
}

const LyricsPlayer: React.FC<LyricsPlayerProps> = ({
  lyricsProcessed,
  currentTick,
}) => {
  const active = useMemo(() => {
    if (!lyricsProcessed) return null;
    return lyricsProcessed.search(currentTick);
  }, [lyricsProcessed, currentTick]);

  const next = useMemo(() => {
    if (!lyricsProcessed || !active) return null;
    return lyricsProcessed.getByIndex(active.index + 1);
  }, [lyricsProcessed, active]);

  const topText = useMemo(() => {
    if (!active) return undefined;
    return active.lyrics.tag === "top"
      ? active.lyrics.value.text
      : next?.tag === "top" && active.lyrics.tag === "bottom"
      ? next.value.text
      : undefined;
  }, [active, next]);

  const bottomText = useMemo(() => {
    if (!active) return undefined;
    return active.lyrics.tag === "bottom"
      ? active.lyrics.value.text
      : next?.tag === "bottom" && active.lyrics.tag === "top"
      ? next.value.text
      : undefined;
  }, [active, next]);

  useEffect(() => {}, [topText, bottomText]);

  if (!active) {
    return null;
  }

  const className = `flex items-center justify-center relative w-full h-full rounded-lg text-center overflow-auto [&::-webkit-scrollbar]:hidden duration-300`;

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 items-center justify-center text-white drop-shadow-lg w-fit overflow-hidden">
        <LyricsList
          tick={active.lyrics.tag === "top" ? currentTick : 0}
          sentence={active.lyrics.value}
          text={topText}
        />
        <LyricsList
          tick={active.lyrics.tag === "bottom" ? currentTick : 0}
          sentence={active.lyrics.value}
          text={bottomText}
        />
      </div>
    </div>
  );
};

export default LyricsPlayer;
