import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import LyricsList from "./lyrics-list";
import { ISentence } from "./types/lyrics-player.type";
import useMidiPlayerStore from "@/stores/midi-plyer-store";
import {
  convertCursorToTicks,
  CurBuilder,
} from "@/lib/karaoke/builder/cur-builder";
import useLyricsStore from "@/stores/lyrics-store";
import ButtonCommon from "@/components/button/button";
import { FaPause, FaPlay } from "react-icons/fa";

interface LyricsPlayerProps {
  windowsWidth?: number;
}

const LyricsPlayer: React.FC<LyricsPlayerProps> = ({ windowsWidth }) => {
  const { tick, totalTicks, play, pause, isPlay, midiPlaying, synth } =
    useMidiPlayerStore();
  const { lyricsCuted: lyrics, getCursor } = useLyricsStore();

  const [sentenceMapping, setSentenceMapping] = useState<ISentence[]>();
  const [topLineIndex, setTopLineIndex] = useState<number>(0);
  const [bottomLineIndex, setBottomLineIndex] = useState<number>(1);
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

  const loadCur = async () => {
    const tpb = midiPlaying?.header.ticksPerBeat;
    if (tpb) {
      const cursor = getCursor();

      const bpm = await synth?.player?.getCurrentBPM();
      if (bpm) {
        const curBuild = new CurBuilder(cursor, lyrics, tpb, bpm);
        return curBuild;
      }
      return undefined;
    }
    return undefined;
  };

  useEffect(() => {
    synth?.synth?.seekPlayer(0);
    loadCur().then((excur) => {
      if (lyrics && excur) {
        const join = lyrics.map((l) => l.join(""));
        const divition = midiPlaying?.header.ticksPerBeat;
        if (!divition) return;

        setLyricsJoin(join);
        const cursor = excur.getCursor();
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
    });
  }, []);

  const currentTick = tick ?? 0;

  const handleTopLineEnd = () => {
    const next = bottomLineIndex + 1;
    if (next < lyricsJoin.length) {
      const nextTopLine = next % lyricsJoin.length;
      setTopLineIndex(nextTopLine);
    }
  };

  const handleBottomLineEnd = () => {
    const next = topLineIndex + 1;
    if (next < lyricsJoin.length) {
      const nextBottomLine = (topLineIndex + 1) % lyricsJoin.length;
      setBottomLineIndex(nextBottomLine);
    }
  };

  if (!sentenceMapping || !lyrics) return <></>;

  return (
    <div className="flex flex-col gap-2">
      <div className="w-full py-10 bg-black text-white flex flex-col items-center justify-center gap-8">
        <div className=" flex flex-col gap-6 items-center justify-center">
          <div className="flex flex-col gap-8 items-center min-h-32">
            <LyricsList
              containerWidth={windowsWidth}
              tick={currentTick}
              text={lyricsJoin[topLineIndex]}
              sentence={sentenceMapping[topLineIndex]}
              isEnd={handleTopLineEnd}
            />

            <LyricsList
              containerWidth={windowsWidth}
              tick={currentTick}
              text={lyricsJoin[bottomLineIndex]}
              sentence={sentenceMapping[bottomLineIndex]}
              isEnd={handleBottomLineEnd}
            />
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <ButtonCommon
          onClick={() => (!isPlay ? play() : pause())}
          icon={isPlay ? <FaPause></FaPause> : <FaPlay></FaPlay>}
        ></ButtonCommon>

        <input
          max={totalTicks}
          onChange={(v) => {
            const value = +v.target.value;
            synth?.synth?.seekPlayer(value);

            if (!sentenceMapping || !lyricsJoin.length) return;

            let topIndex = 0;
            let bottomIndex = 1;

            for (let i = 0; i < sentenceMapping.length; i += 2) {
              const currentStart = sentenceMapping[i].start;

              const nextStart =
                i + 2 < sentenceMapping.length
                  ? sentenceMapping[i + 2].start
                  : Number.MAX_VALUE;

              if (value >= currentStart && value < nextStart) {
                topIndex = i;
                bottomIndex = Math.min(i + 1, sentenceMapping.length - 1);
                break;
              }
            }

            setTopLineIndex(topIndex);
            setBottomLineIndex(bottomIndex);
          }}
          min={0}
          value={tick}
          type="range"
          className="w-full"
        />
      </div>
    </div>
  );
};

export default LyricsPlayer;
