import ButtonCommon from "@/components/button/button";
import useLyricsStore from "@/stores/lyrics-store";
import useMidiPlayerStore from "@/stores/midi-plyer-store";
import React from "react";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";

interface TouchNextLyrProps {}

const TouchNextLyr: React.FC<TouchNextLyrProps> = ({}) => {
  const isPlay = useMidiPlayerStore((state) => state.isPlay);
  const lyricsCuted = useLyricsStore((state) => state.lyricsCuted);
  const setLineIndex = useLyricsStore((state) => state.setLineIndex);
  const setWordIndex = useLyricsStore((state) => state.setWordIndex);
  const lineIndex = useLyricsStore((state) => state.lineIndex);
  const wordIndex = useLyricsStore((state) => state.wordIndex);

  const moveWord = (forward: boolean) => {
    if (forward) {
      const currentLineMaxWords = lyricsCuted[lineIndex]?.length;
      if (wordIndex + 1 < currentLineMaxWords) {
        setWordIndex(wordIndex + 1);
        // showTime(wordIndex);
      } else if (lineIndex + 1 < lyricsCuted.length) {
        setLineIndex(lineIndex + 1);
        setWordIndex(0);
        // showTime(wordIndex);
      }
    } else {
      if (wordIndex - 1 >= 0) {
        setWordIndex(wordIndex - 1);
        // showTime(wordIndex);
      } else if (lineIndex - 1 >= 0) {
        setLineIndex(lineIndex - 1);
        setWordIndex(lyricsCuted[lineIndex - 1]?.length - 1);
      }
    }
  };

  return (
    <>
      <div className="flex gap-2 mb-4">
        <ButtonCommon
          disabled={!isPlay}
          icon={<FaArrowLeft></FaArrowLeft>}
          onClick={() => moveWord(false)}
          className="w-full"
        >
          ย้อนกลับ
        </ButtonCommon>
        <ButtonCommon
          disabled={!isPlay}
          icon={<FaArrowRight></FaArrowRight>}
          onClick={() => moveWord(true)}
          className="w-full"
        >
          ต่อไป
        </ButtonCommon>
      </div>
    </>
  );
};

export default TouchNextLyr;
