import React, { useEffect, useRef, useState } from "react";
import LyricsCharacter from "../character";
import { groupThaiCharacters } from "@/lib/karaoke/cursor/lib";
import { ISentence } from "@/lib/array-range";
import { LyricsCharacterStyle } from "../../lyrics-character";

interface LyricsListProps {
  sentence?: ISentence;
  tick: number;
  textStyle?: LyricsCharacterStyle;
}

const LyricsList: React.FC<LyricsListProps> = ({
  sentence,
  tick,
  textStyle,
}) => {
  const [clipPercent, setClipPercent] = useState(0);
  const [scaleX, setScaleX] = useState(1);
  const lyricsRef = useRef<HTMLDivElement>(null);

  const text = sentence?.text ?? "";

  const calculateClipPercent = () => {
    if (!sentence?.valueName.length || tick < sentence.start) return 0;

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

  useEffect(() => {
    setClipPercent(calculateClipPercent());
  }, [tick, sentence]);

  const updateScale = () => {
    if (!lyricsRef.current) return;

    const textWidth = lyricsRef.current.scrollWidth;

    const padding = 20;
    const availableWidth = window.innerWidth - padding * 2;

    if (textWidth > availableWidth) {
      setScaleX(availableWidth / textWidth);
    } else {
      setScaleX(1);
    }
  };

  useEffect(() => {
    updateScale();
  }, [text]);

  useEffect(() => {
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  if (!sentence) return null;

  return (
    <div
      ref={lyricsRef}
      className="relative w-full"
      style={{
        transform: `scaleX(${scaleX})`,
        transformOrigin: "center",
        display: "inline-block",
      }}
    >
      <div className="w-full flex-col gap-2 overflow-hidden flex justify-center items-center">
        <LyricsCharacter
          {...textStyle}
          clip={clipPercent}
          text={text}
          className="text-2xl md:text-4xl"
        />
      </div>
      <div className="w-full flex-col gap-2 overflow-hidden flex justify-center items-center">
        <LyricsCharacter
          {...textStyle}
          fontSize={textStyle?.fontSize ?? 0 - 10}
          fontOutline="font-outline md:font-outline-2"
          color={{
            color: "#DF692E",
            colorBorder: "#0000FF",
          }}
          activeColor={{
            color: "#000000",
            colorBorder: "#ffffff",
          }}
          className="text-xs md:text-base"
          clip={clipPercent}
          text={sentence.vocal}
        />
      </div>
    </div>
  );
};

export default LyricsList;
