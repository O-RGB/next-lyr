import { LyricsCharacterStyle } from "@/components/lyrics/lyrics-character";
import React, { useEffect, useRef, useState } from "react";
import { ISentence } from "../types";
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

  // Reset event flags when text or sentence changes
  useEffect(() => {
    eventsRef.current = { started: false, completed: false };
  }, [text, sentence]);

  // Core logic for syncing lyrics with audio
  useEffect(() => {
    // Check for valid data
    if (!text || !sentence || !text.length) {
      setClipPercent(0);
      return;
    }

    // Before the sentence starts
    if (tick < sentence.start) {
      setClipPercent(0);
      return;
    }

    // Fire onStarted callback
    if (!eventsRef.current.started && onStarted) {
      onStarted();
      eventsRef.current.started = true;
    }

    // After the last character time
    const lastCharTime = sentence.valueName[text.length - 1] || 0;
    if (tick >= lastCharTime) {
      setClipPercent(100);

      // Fire onCompleted callback
      if (!eventsRef.current.completed && onCompleted) {
        onCompleted();
        eventsRef.current.completed = true;
      }
      return;
    }

    // Find the character we're currently at
    for (let i = 0; i < text.length - 1; i++) {
      const currentTime = sentence.valueName[i] || 0;
      const nextTime = sentence.valueName[i + 1] || 0;

      if (tick >= currentTime && tick < nextTime) {
        // Calculate the precise percentage within this character interval
        const charProgress = (tick - currentTime) / (nextTime - currentTime);
        const charPercent = i + charProgress;
        setClipPercent((charPercent / text.length) * 100);
        return;
      }
    }
  }, [tick, text, sentence, onStarted, onCompleted]);

  // Handle text resizing
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
