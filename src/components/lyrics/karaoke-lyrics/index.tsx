import React, { ReactNode, useMemo } from "react";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { LyricsCharacterStyle } from "../lyrics-character";
import LyricsList from "./line";

interface LyricsPlayerProps {
  textStyle?: LyricsCharacterStyle;
  playerControls?: ReactNode | null;
}

const LyricsPlayer: React.FC<LyricsPlayerProps> = ({
  textStyle,
  playerControls,
}) => {
  const lyricsProcessed = useKaraokeStore((state) => state.lyricsProcessed);

  const currentTime = useKaraokeStore((state) => state.currentTime);
  const active = useMemo(() => {
    if (!lyricsProcessed) return null;
    return lyricsProcessed.search(currentTime);
  }, [lyricsProcessed, currentTime]);

  const next = useMemo(() => {
    if (!lyricsProcessed || !active) return null;
    return lyricsProcessed.getByIndex(active.index + 1);
  }, [lyricsProcessed, active]);

  const getSentenceForTag = (tag: "top" | "bottom") => {
    if (!active) return undefined;
    if (active.lyrics.tag === tag) return active.lyrics.value;
    if (next?.tag === tag) return next.value;
    return undefined;
  };

  const topSentence = getSentenceForTag("top");
  const bottomSentence = getSentenceForTag("bottom");

  const isTopActive = active?.lyrics.tag === "top";
  const isBottomActive = active?.lyrics.tag === "bottom";

  return (
    <div className="flex flex-col h-full w-fit">
      <div className="flex-grow flex items-center justify-center relative w-fit rounded-lg text-center overflow-auto [&::-webkit-scrollbar]:hidden duration-300">
        <div className="flex flex-col items-center justify-center text-white drop-shadow-lg w-fit overflow-visible py-4">
          <LyricsList
            tick={isTopActive ? currentTime : 0}
            sentence={topSentence}
            textStyle={textStyle}
          />
          <LyricsList
            tick={isBottomActive ? currentTime : 0}
            sentence={bottomSentence}
            textStyle={textStyle}
          />
        </div>
      </div>
      {playerControls && <>{playerControls}</>}
    </div>
  );
};

export default LyricsPlayer;
