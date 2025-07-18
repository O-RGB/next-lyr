import React, { useEffect, useRef, useState } from "react";
import { ISentence } from "./types/lyrics-player.type";
import LyricsCharacter from "./lyrics-character";

interface LyricsListProps {
  text?: string;
  sentence?: ISentence;
  tick: number;
  isEnd?: () => void;
  containerWidth?: number;
}

const LyricsList: React.FC<LyricsListProps> = ({
  text = "",
  sentence,
  tick,
  isEnd,
  containerWidth,
}) => {
  const [clipPercent, setClipPercent] = useState(0);
  const [scaleX, setScaleX] = useState(1);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!text || !sentence || text.length === 0) {
      setClipPercent(0);
      return;
    }

    if (tick < sentence.start) {
      setClipPercent(0);
      return;
    }

    const lastCharTime = sentence.valueName[text.length - 1] || 0;

    if (tick >= lastCharTime) {
      setClipPercent(100);
      if (isEnd) {
        setTimeout(isEnd, 500);
      }
      return;
    }

    // Initialize targetIndex to -1, meaning no characters should be shown yet
    let targetIndex = -1;

    for (let i = 0; i < text.length; i++) {
      const charTime = sentence.valueName[i] || 0;
      if (tick >= charTime) {
        targetIndex = i;
      } else {
        break;
      }
    }

    // Calculate percentage based on targetIndex
    if (targetIndex < 0) {
      setClipPercent(0);
    } else {
      const percent = ((targetIndex + 1) / text.length) * 100;
      setClipPercent(percent);
    }
  }, [tick, text, sentence, isEnd]);
  useEffect(() => {
    if (textRef.current && containerWidth) {
      const textWidth = textRef.current.scrollWidth;

      if (textWidth > containerWidth) {
        setScaleX(containerWidth / textWidth);
      } else {
        setScaleX(1);
      }
    }
  }, [text, containerWidth]);

  return (
    <div
      ref={textRef}
      style={{
        transform: `scaleX(${scaleX})`,
        transformOrigin: "center center",
      }}
    >
      <LyricsCharacter clip={clipPercent} lyr={text} size="md" />
    </div>
  );
};

export default LyricsList;
