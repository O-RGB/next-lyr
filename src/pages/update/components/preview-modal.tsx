import { useEffect, useState, useRef, RefObject } from "react";
import { LyricWordData } from "../lib/type";
import { Modal } from "./common/modal";

type Props = {
  lyricsData: LyricWordData[];
  audioRef: RefObject<HTMLAudioElement | null>;
  onClose: () => void;
};

export default function PreviewModal({ lyricsData, audioRef, onClose }: Props) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const animationFrameRef = useRef<number>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    audio.play();

    const animate = () => {
      const currentTime = audio.currentTime;
      const newIndex = lyricsData.findIndex(
        (word) =>
          word.start !== null &&
          word.end !== null &&
          currentTime >= word.start &&
          currentTime < word.end
      );

      setHighlightedIndex(newIndex);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameRef.current!);
      audio.pause();
    };
  }, [lyricsData, audioRef]);

  const lines = lyricsData.reduce<LyricWordData[][]>((acc, word) => {
    // This simple logic groups words. A more robust solution might preserve original line breaks.
    if (acc.length === 0 || acc[acc.length - 1].length >= 8) {
      acc.push([]);
    }
    acc[acc.length - 1].push(word);
    return acc;
  }, []);

  return (
    <Modal title="Karaoke Preview" onClose={onClose}>
      <div className="h-[60vh] overflow-y-auto p-4 bg-slate-900 text-slate-300 rounded-lg text-center font-semibold">
        {lines.map((line, lineIndex) => (
          <p key={lineIndex} className="text-4xl leading-relaxed my-4">
            {line.map((word) => (
              <span
                key={word.index}
                className={[
                  "transition-colors duration-150",
                  highlightedIndex === word.index &&
                    "text-white bg-blue-600 px-2 rounded-md",
                ].join(" ")}
              >
                {word.name}{" "}
              </span>
            ))}
          </p>
        ))}
      </div>
    </Modal>
  );
}
