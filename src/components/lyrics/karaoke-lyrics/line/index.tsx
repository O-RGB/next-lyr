import React, { useEffect, useRef, useState } from "react";
import LyricsCharacter from "../character";
import { LyricsCharacterStyle } from "@/components/lyrics/lyrics-character";
import { groupThaiCharacters } from "@/lib/karaoke/cursor/lib";
import { ISentence } from "@/lib/utils/arrayrange";

interface LyricsListProps {
  sentence?: ISentence;
  nextSentence?: ISentence;
  tick: number;
  textStyle?: LyricsCharacterStyle;
}

const LyricsList: React.FC<LyricsListProps> = ({
  sentence,
  tick,
  textStyle,
}) => {
  const [clipPercent, setClipPercent] = useState(0);
  const [scale, setScale] = useState(1);
  const textRef = useRef<HTMLDivElement>(null);
  const lyricsContentRef = useRef<HTMLDivElement>(null);

  const text = sentence?.text ?? "";

  const calculateClipPercent = () => {
    if (!sentence?.valueName.length || tick < sentence.start) {
      return 0;
    }

    const clusters = groupThaiCharacters(text, sentence.valueName);
    if (!clusters.length) return 0;

    const lastCluster = clusters[clusters.length - 1];
    const lastCharIndex = text.lastIndexOf(
      lastCluster.text[lastCluster.text.length - 1]
    );
    const lastCharTime = sentence.valueName[lastCharIndex] || 0;

    if (tick >= lastCharTime) return 100;

    for (let i = 0; i < clusters.length; i++) {
      const currentCluster = clusters[i];
      const nextCluster = clusters[i + 1];
      const nextTime = nextCluster ? nextCluster.tick : lastCharTime;

      if (tick >= currentCluster.tick && tick < nextTime) {
        const progress =
          (tick - currentCluster.tick) / (nextTime - currentCluster.tick);
        return ((i + progress) / clusters.length) * 100;
      }
    }

    return 0;
  };

  const updateScale = () => {
    if (!textRef.current || !lyricsContentRef.current) return;

    const containerWidth = textRef.current.offsetWidth;
    const contentWidth = lyricsContentRef.current.offsetWidth;

    setScale(contentWidth > containerWidth ? containerWidth / contentWidth : 1);
  };

  useEffect(() => {
    setClipPercent(calculateClipPercent());
  }, [tick, sentence]);

  useEffect(() => {
    updateScale();
    const handleResize = () => updateScale();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [text]);

  if (!sentence) return null;

  return (
    <div
      ref={textRef}
      className="relative px-10 w-fit"
      style={{
        transform: `scaleX(${scale})`,
        transformOrigin: "center center",
      }}
    >
      <div ref={lyricsContentRef}>
        <LyricsCharacter clip={clipPercent} text={text} {...textStyle} />
      </div>
    </div>
  );
};

export default LyricsList;
