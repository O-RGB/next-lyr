import React from "react";
import LyricsCharacter from "./lyrics-character";
import { ISentence } from "./types/lyrics-player.type";

interface LyricsListProps {
  text: string;
  sentence: ISentence;
  tick: number;
  isEnd?: () => void;
}

const LyricsList: React.FC<LyricsListProps> = ({
  text,
  sentence,
  tick,
  isEnd,
}) => {
  const groupThaiCharacters = (text: string) => {
    const result: string[] = [];
    let currentChar = "";

    const thaiDiacritics = [
      "\u0e31",
      "\u0e34",
      "\u0e35",
      "\u0e36",
      "\u0e37",
      "\u0e38",
      "\u0e39",
      "\u0e47",
      "\u0e48",
      "\u0e49",
      "\u0e4a",
      "\u0e4b",
      "\u0e4c",
      "\u0e4d",
      "\u0e30",
      "\u0e32",
      "\u0e33",
      "\u0e40",
      "\u0e41",
      "\u0e42",
      "\u0e43",
      "\u0e44",
    ];

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      const isDiacritic = thaiDiacritics.includes(char);

      if (isDiacritic && currentChar) {
        currentChar += char;
      } else {
        if (currentChar) {
          result.push(currentChar);
        }

        currentChar = char;
      }
    }

    if (currentChar) {
      result.push(currentChar);
    }

    return result;
  };

  const chars = groupThaiCharacters(text);

  const calculateClip = (
    currentTime: number,
    nextTime: number,
    end: boolean
  ) => {
    if (tick < currentTime) return 0;
    if (tick >= nextTime) {
      if (end) {
        setTimeout(() => {
          isEnd?.();
        }, 500);
      }
      return 100;
    }
    return ((tick - currentTime) / (nextTime - currentTime)) * 100;
  };

  const getTimingForGroupedChar = (groupIndex: number) => {
    let charCount = 0;
    for (let i = 0; i < groupIndex; i++) {
      charCount += chars[i].length;
    }
    return sentence.valueName[charCount];
  };

  return (
    <div className="flex flex-wrap -mb-10">
      {chars.map((char, key) => {
        const currentTime = getTimingForGroupedChar(key);
        const nextTime =
          key < chars.length - 1
            ? getTimingForGroupedChar(key + 1)
            : currentTime + 30;

        const clipValue = calculateClip(
          currentTime,
          nextTime,
          key === chars.length - 1
        );

        return (
          <div key={`lyr-b-${key}`} className="-mx-[7px]">
            <LyricsCharacter size="lg" lyr={char} clip={clipValue} />
          </div>
        );
      })}
    </div>
  );
};

export default LyricsList;
