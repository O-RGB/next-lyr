import React, { useEffect, useRef, useState } from "react";
import { Modal } from "./common/modal";
import LyricsCharacter, { LyricsCharacterStyle } from "./lyrics-character";
import GraphemeSplitter from "grapheme-splitter";

type Props = {
  timestamps: number[];
  lyrics: string[][];
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onClose: () => void;
};

const PreviewModal: React.FC<Props> = ({
  timestamps,
  lyrics,
  audioRef,
  onClose,
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const [wordStartTimes, setWordStartTimes] = useState<number[][]>([]);
  const splitter = new GraphemeSplitter();

  useEffect(() => {
    let graphemeIndex = 0;
    const newWordStartTimes = lyrics.map((line) =>
      line.map((word) => {
        const startTime = timestamps[graphemeIndex] ?? 0;
        graphemeIndex += word.length;
        return startTime;
      })
    );
    setWordStartTimes(newWordStartTimes);
  }, [lyrics, timestamps, splitter]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    audio.play();

    const animate = () => {
      if (audio) {
        setCurrentTime(audio.currentTime);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [audioRef]);

  const textStyle: LyricsCharacterStyle = {
    color: { color: "#FFF", colorBorder: "#00005E" },
    activeColor: { color: "red", colorBorder: "#00005E" },
    fontSize: 48,
  };

  if (wordStartTimes.length === 0) {
    return null;
  }

  return (
    <Modal title="Karaoke Preview" onClose={onClose}>
      <div className=" overflow-y-auto p-4 bg-slate-900 text-center font-semibold">
        <div className="flex flex-col justify-center items-center h-full">
          {lyrics.map((line, lineIndex) => (
            <div
              key={lineIndex}
              className="flex flex-row flex-wrap justify-center my-2"
            >
              {line.map((word, wordIndex) => {
                const startTime = wordStartTimes[lineIndex]?.[wordIndex] ?? 0;
                const nextWordTime = wordStartTimes[lineIndex]?.[wordIndex + 1];
                const nextLineFirstWordTime =
                  wordStartTimes[lineIndex + 1]?.[0];
                const endTime =
                  nextWordTime ?? nextLineFirstWordTime ?? startTime + 1.0;

                const duration = endTime - startTime;
                let status: "inactive" | "active" | "completed" = "inactive";
                if (currentTime >= startTime && currentTime < endTime) {
                  status = "active";
                } else if (currentTime >= endTime) {
                  status = "completed";
                }

                return (
                  <div key={wordIndex}>
                    <LyricsCharacter
                      lyr={word}
                      status={status}
                      duration={duration}
                      fontSize={textStyle.fontSize}
                      color={textStyle.color}
                      activeColor={textStyle.activeColor}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default PreviewModal;
