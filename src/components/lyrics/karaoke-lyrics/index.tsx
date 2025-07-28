import React, { useMemo } from "react";
import { LyricsRangeArray } from "@/lib/karaoke/lyrics/lyrics-mapping";
import { ISentence } from "@/lib/karaoke/lyrics/types";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { LyricsCharacterStyle } from "../lyrics-character";
import LyricsList from "./line";

interface LyricsPlayerProps {
  lyricsProcessed: LyricsRangeArray<ISentence>;
  textStyle?: LyricsCharacterStyle;
}

const LyricsPlayer: React.FC<LyricsPlayerProps> = ({
  lyricsProcessed,
  textStyle,
}) => {
  const currentTime = useKaraokeStore((state) => state.currentTime);
  const chordsData = useKaraokeStore((state) => state.chordsData);

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

  const className = `flex items-center justify-center relative w-full h-full rounded-lg text-center overflow-auto [&::-webkit-scrollbar]:hidden duration-300`;

  return (
    <div className={className}>
      <div className="flex flex-col items-center justify-center text-white drop-shadow-lg w-full overflow-visible pt-4">
        <LyricsList
          tick={isTopActive ? currentTime : 0}
          sentence={topSentence}
          nextSentence={isTopActive ? next?.value : undefined}
          chords={isTopActive ? chordsData : []}
          textStyle={textStyle}
        />
        <LyricsList
          tick={isBottomActive ? currentTime : 0}
          sentence={bottomSentence}
          nextSentence={isBottomActive ? next?.value : undefined}
          chords={isBottomActive ? chordsData : []}
          textStyle={textStyle}
        />
      </div>
    </div>
  );
};

export default LyricsPlayer;
