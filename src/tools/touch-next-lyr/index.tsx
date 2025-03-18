import ButtonCommon from "@/components/button/button";
import useLyricsStore from "@/stores/lyrics-store";
import useMidiPlayerStore from "@/stores/midi-plyer-store";
import React, { useEffect } from "react";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";

interface TouchNextLyrProps {}

const TouchNextLyr: React.FC<TouchNextLyrProps> = ({}) => {
  const lyricsCuted = useLyricsStore((state) => state.lyricsCuted);
  const setLineIndex = useLyricsStore((state) => state.setLineIndex);
  const setWordIndex = useLyricsStore((state) => state.setWordIndex);
  const lineIndex = useLyricsStore((state) => state.lineIndex);
  const wordIndex = useLyricsStore((state) => state.wordIndex);
  const cursors = useLyricsStore((state) => state.cursors);
  const synth = useMidiPlayerStore((state) => state.synth);
  const beat = useMidiPlayerStore((state) => state.beat);

  const showTime = async (line: number) => {
    const cursor = await synth?.player?.getCurrentTiming();
    if (cursor) {
      const list = cursors.get(line);
      if (!list) {
        cursors.set(line, [cursor]);
      } else {
        cursors.set(line, [...list, cursor]);
      }
      console.log(cursors.values());
    }
  };

  const moveWord = (forward: boolean) => {
    if (forward) {
      const currentLineMaxWords = lyricsCuted[lineIndex]?.length;
      if (wordIndex + 1 < currentLineMaxWords) {
        setWordIndex(wordIndex + 1);
        showTime(lineIndex);
      } else if (lineIndex + 1 < lyricsCuted.length) {
        showTime(lineIndex + 1);
        setLineIndex(lineIndex + 1);
        setWordIndex(0);
      } else {
        setLineIndex(lineIndex + 1);
        setWordIndex(0);
      }
    } else {
      // if (wordIndex - 1 >= 0) {
      //   setWordIndex(wordIndex - 1);
      //   showTime(wordIndex);
      // } else if (lineIndex - 1 >= 0) {
      //   setLineIndex(lineIndex - 1);
      //   setWordIndex(lyricsCuted[lineIndex - 1]?.length - 1);
      // }
    }
  };

  useEffect(() => {}, [beat]);

  return (
    <>
      <div className="flex gap-2 mb-4">
        {/* <ButtonCommon
          icon={<FaArrowLeft></FaArrowLeft>}
          onClick={() => moveWord(false)}
          className="w-full"
        >
          ย้อนกลับ
        </ButtonCommon> */}
        <ButtonCommon
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
