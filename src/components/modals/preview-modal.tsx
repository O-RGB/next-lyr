import React, { useEffect, useRef, useState } from "react";
import { LyricsCharacterStyle } from "../lyrics/lyrics-character";
import { MidiPlayerRef } from "../../modules/js-synth/player";
import { LyricsRangeArray } from "../../lib/karaoke/lyrics/lyrics-mapping";
import { ISentence } from "../../lib/karaoke/lyrics/types";
import LyricsPlayer from "../../lib/karaoke/lyrics";
import { MusicMode } from "@/types/common.type";

type Props = {
  lyricsProcessed: LyricsRangeArray<ISentence>;
  timestamps: number[];
  lyrics: string[][];
  mode: MusicMode;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  midiPlayerRef: React.RefObject<MidiPlayerRef>;
  onClose: () => void;
};

type ProcessedWord = {
  text: string;
  startTime: number;
  endTime: number;
};

const PreviewModal: React.FC<Props> = ({
  lyricsProcessed,
  timestamps,
  lyrics,
  mode,
  audioRef,
  midiPlayerRef,
  onClose,
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [processedLyrics, setProcessedLyrics] = useState<ProcessedWord[][]>([]);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!timestamps || timestamps.length === 0) return;

    const allLines: ProcessedWord[][] = [];
    let tickIndex = 0;

    lyrics.forEach((line, lineIndex) => {
      const currentLine: ProcessedWord[] = [];
      line.forEach((word) => {
        const startTime = timestamps[tickIndex];
        const endTime = timestamps[tickIndex + word.length];
        currentLine.push({ text: word, startTime, endTime });
        tickIndex += word.length;
      });
      allLines.push(currentLine);
      if (lineIndex < lyrics.length - 1) {
        tickIndex++;
      }
    });
    setProcessedLyrics(allLines);
  }, [lyrics, timestamps]);

  useEffect(() => {
    const audio = audioRef.current;
    const midiPlayer = midiPlayerRef.current;

    const startPlayback = () => {
      if (mode === "mp3" && audio) {
        audio.currentTime = 0;
        audio.play();
        intervalRef.current = window.setInterval(() => {
          setCurrentTime(audio.currentTime);
        }, 50);
      } else if (mode === "midi" && midiPlayer) {
        const handleTickUpdate = (tick: number) => setCurrentTime(tick);
        midiPlayer.addEventListener("tickupdate", handleTickUpdate);
        midiPlayer.seek(0);
        midiPlayer.play();
        return () => {
          midiPlayer.removeEventListener("tickupdate", handleTickUpdate);
          if (midiPlayer.isPlaying) midiPlayer.pause();
        };
      }
    };

    const stopPlayback = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (mode === "mp3" && audio) audio.pause();
    };

    startPlayback();

    return stopPlayback;
  }, [mode, audioRef, midiPlayerRef]);

  return (
    <div className="w-full h-56 bg-black">
      <LyricsPlayer lyricsProcessed={lyricsProcessed}></LyricsPlayer>
    </div>
  );
};

export default PreviewModal;
