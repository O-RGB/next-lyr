import { LyricsCharacterStyle } from "@/components/lyrics/lyrics-character";
import React, { useEffect, useRef, useState } from "react";
import { ISentence } from "../../../lib/karaoke/lyrics/types";
import LyricsCharacter from "./character";

interface LyricsListProps {
  text?: string;
  sentence?: ISentence;
  tick: number;
  containerWidth?: number;
  onStarted?: () => void;
  onCompleted?: () => void;
  textStyle?: LyricsCharacterStyle;
}

const LyricsList: React.FC<LyricsListProps> = ({
  text = "",
  sentence,
  tick,
  containerWidth,
  onStarted,
  onCompleted,
  textStyle,
}) => {
  const [clipPercent, setClipPercent] = useState(0);
  const [scale, setScale] = useState(1);
  const textRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef({ started: false, completed: false });

  useEffect(() => {
    eventsRef.current = { started: false, completed: false };
  }, [text, sentence]);

  useEffect(() => {
    if (!text || !sentence || !text.length) {
      setClipPercent(0);
      return;
    }

    if (tick < sentence.start) {
      setClipPercent(0);
      return;
    }

    if (!eventsRef.current.started && onStarted) {
      onStarted();
      eventsRef.current.started = true;
    }

    const lastCharTime = sentence.valueName[text.length - 1] || 0;
    if (tick >= lastCharTime) {
      setClipPercent(100);

      if (!eventsRef.current.completed && onCompleted) {
        onCompleted();
        eventsRef.current.completed = true;
      }
      return;
    }

    for (let i = 0; i < text.length - 1; i++) {
      const currentTime = sentence.valueName[i] || 0;
      const nextTime = sentence.valueName[i + 1] || 0;

      if (tick >= currentTime && tick < nextTime) {
        const charProgress = (tick - currentTime) / (nextTime - currentTime);
        const charPercent = i + charProgress;
        setClipPercent((charPercent / text.length) * 100);
        return;
      }
    }
  }, [tick, text, sentence, onStarted, onCompleted]);

  useEffect(() => {
    if (textRef.current && containerWidth) {
      const textWidth = textRef.current.scrollWidth;
      setScale(textWidth > containerWidth ? containerWidth / textWidth : 1);
    }
  }, [text, containerWidth]);

  return (
    <div
      ref={textRef}
      className="px-10 w-fit"
      style={{
        transform: `scaleX(${scale})`,
        transformOrigin: "center center",
      }}
    >
      <LyricsCharacter clip={clipPercent} text={text} />
    </div>
  );
};

export default LyricsList;
