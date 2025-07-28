import { LyricsCharacterStyle } from "@/components/lyrics/lyrics-character";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { ISentence } from "../../../../lib/karaoke/lyrics/types";
import LyricsCharacter from "../character";
import { ChordEvent } from "@/modules/midi-klyr-parser/lib/processor";

interface LyricsListProps {
  sentence?: ISentence;
  nextSentence?: ISentence;
  tick: number;
  containerWidth?: number;
  onStarted?: () => void;
  onCompleted?: () => void;
  textStyle?: LyricsCharacterStyle; // <--- เพิ่ม prop กลับเข้ามา
  chords?: ChordEvent[];
}

const LyricsList: React.FC<LyricsListProps> = ({
  sentence,
  nextSentence,
  tick,
  containerWidth,
  onStarted,
  onCompleted,
  textStyle, // <--- รับค่า prop
  chords,
}) => {
  const [clipPercent, setClipPercent] = useState(0);
  const [scale, setScale] = useState(1);
  const [lyricsWidth, setLyricsWidth] = useState(0);
  const textRef = useRef<HTMLDivElement>(null);
  const lyricsContentRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef({ started: false, completed: false });

  const text = sentence?.text ?? "";

  useEffect(() => {
    if (lyricsContentRef.current) {
      setLyricsWidth(lyricsContentRef.current.offsetWidth);
    }
  }, [lyricsContentRef.current, text]);

  const lineChords = useMemo(() => {
    if (!chords || !sentence) return [];
    const lineEndBoundary = nextSentence ? nextSentence.start : Infinity;
    return chords.filter(
      (chord) => chord.tick >= sentence.start && chord.tick < lineEndBoundary
    );
  }, [chords, sentence, nextSentence]);

  const processedChords = useMemo(() => {
    if (!lineChords.length || lyricsWidth === 0 || !sentence) return [];
    // ... (โค้ดส่วนนี้เหมือนเดิม) ...
    const sentenceEndTick =
      sentence.valueName[text.length - 1] || sentence.start;
    const sentenceVisualDuration = sentenceEndTick - sentence.start;

    const results: (ChordEvent & { left: number })[] = [];
    const overflow: ChordEvent[] = [];

    for (const chord of lineChords) {
      if (chord.tick <= sentenceEndTick) {
        const chordTimeOffset = chord.tick - sentence.start;
        const idealPx =
          sentenceVisualDuration > 0
            ? (chordTimeOffset / sentenceVisualDuration) * lyricsWidth
            : 0;
        results.push({ ...chord, left: idealPx });
      } else {
        overflow.push(chord);
      }
    }

    if (overflow.length > 0) {
      const firstOverflowTick = overflow[0].tick;
      const lastOverflowTick = overflow[overflow.length - 1].tick;
      const overflowTimeRange = lastOverflowTick - sentenceEndTick;
      const MAX_OVERFLOW_PX = 200;

      for (const chord of overflow) {
        let overflowOffsetPx = 0;
        if (overflowTimeRange > 0) {
          const progress = (chord.tick - sentenceEndTick) / overflowTimeRange;
          overflowOffsetPx = progress * MAX_OVERFLOW_PX;
        } else {
          overflowOffsetPx = MAX_OVERFLOW_PX / 2;
        }
        results.push({ ...chord, left: lyricsWidth + overflowOffsetPx });
      }
    }
    return results;
  }, [lineChords, sentence, lyricsWidth, text]);

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
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        {processedChords.map((chord, i) => (
          <div
            key={`${chord.tick}-${chord.chord}-${i}`}
            className="absolute text-white font-bold text-xs  px-1 bg-purple-500"
            style={{
              left: `${chord.left}px`,
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
              top: "-20px",
            }}
          > 
            {chord.chord}
          </div>
        ))}
      </div>

      <div ref={lyricsContentRef}>
        {/* ส่ง props ของ textStyle ทั้งหมดไปยัง LyricsCharacter */}
        <LyricsCharacter clip={clipPercent} text={text} {...textStyle} />
      </div>
    </div>
  );
};

export default LyricsList;
