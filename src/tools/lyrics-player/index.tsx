import React, { useEffect, useState } from "react";
import LyricsList from "./lyrics-list";
import { ISentence } from "./types/lyrics-player.type";
import useMidiPlayerStore from "@/stores/midi-plyer-store";
import { convertCursorToTicks } from "@/lib/karaoke/builder/cur-builder";
import useLyricsStore from "@/stores/lyrics-store";

interface LyricsPlayerProps {}

const LyricsPlayer: React.FC<LyricsPlayerProps> = ({}) => {
  const tick = useMidiPlayerStore((state) => state.tick);
  const stop = useMidiPlayerStore((state) => state.stop);
  const play = useMidiPlayerStore((state) => state.play);
  const midiPlaying = useMidiPlayerStore((state) => state.midiPlaying);
  const [sentenceMapping, setSentenceMapping] = useState<ISentence[]>();
  const [topLineIndex, setTopLineIndex] = useState<number>(0);
  const [bottomLineIndex, setBottomLineIndex] = useState<number>(1);
  const lyrics = useLyricsStore((state) => state.lyricsCuted);
  const cursor = useLyricsStore((state) => state.cursorsPreview);
  const [lyricsJoin, setLyricsJoin] = useState<string[]>([]);

  function splitCursorByLyrics(lyrics: string[], cursor: number[]) {
    let cursorIndex = 0;
    const result = [];

    for (const line of lyrics) {
      const lineLength = line.length;
      const lineCursor = cursor.slice(
        cursorIndex,
        cursorIndex + lineLength + 1
      );
      result.push(lineCursor);
      cursorIndex += lineLength + 1;
    }

    return result;
  }

  useEffect(() => {
    stop();
    if (lyrics && cursor) {
      const join = lyrics.map((l) => l.join(""));
      const divition = midiPlaying?.header.ticksPerBeat;
      if (!divition) return;

      setLyricsJoin(join);
      const curToTicks = convertCursorToTicks(divition, cursor);
      const splitCursor = splitCursorByLyrics(join, curToTicks);

      const formattedLyrics = splitCursor.map((lineCursor) => {
        const [start, ...valueName] = lineCursor;
        return {
          start,
          valueName,
        };
      });

      setSentenceMapping(formattedLyrics);
      setTimeout(() => {
        play();
      }, 200);
    }
  }, []);

  if (!sentenceMapping) return <></>;
  if (!cursor) return <></>;
  if (!lyrics) return <></>;

  const currentTick = tick ?? 0;

  const handleTopLineEnd = () => {
    const nextTopLine = (bottomLineIndex + 1) % lyricsJoin.length;
    setTopLineIndex(nextTopLine);
  };

  const handleBottomLineEnd = () => {
    const nextBottomLine = (topLineIndex + 1) % lyricsJoin.length;
    setBottomLineIndex(nextBottomLine);
  };

  return (
    <div className="w-full py-10 bg-black text-white flex flex-col items-center justify-center gap-8">
      <div className="flex flex-col gap-6 items-center justify-center">
        <div className="flex flex-col gap-8 items-center min-h-32">
          <LyricsList
            tick={currentTick}
            text={lyricsJoin[topLineIndex]}
            sentence={sentenceMapping[topLineIndex]}
            isEnd={handleTopLineEnd}
          />

          <LyricsList
            tick={currentTick}
            text={lyricsJoin[bottomLineIndex]}
            sentence={sentenceMapping[bottomLineIndex]}
            isEnd={handleBottomLineEnd}
          />
        </div>
      </div>
    </div>
  );
};

export default LyricsPlayer;
