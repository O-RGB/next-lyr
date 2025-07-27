import React, { useEffect, useRef, useState } from "react";
import { LyricsCharacterStyle } from "../lyrics/lyrics-character";
import { MidiPlayerRef } from "../../modules/js-synth";
import { MusicMode } from "../../types/type";
import { LyricsRangeArray } from "../../lib/lyrics/lyrics-mapping";
import { ISentence } from "../../lib/lyrics/types";
import LyricsPlayer from "../../lib/lyrics";

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
  const animationFrameRef = useRef<number | null>(null);

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

    if (mode === "mp3" && audio) {
      audio.currentTime = 0;
      audio.play();
      const animate = () => {
        setCurrentTime(audio.currentTime);
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animate();

      return () => {
        if (animationFrameRef.current)
          cancelAnimationFrame(animationFrameRef.current);
        if (audio) audio.pause();
      };
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
  }, [mode, audioRef, midiPlayerRef]);

  const convertTickDurationToSeconds = (durationInTicks: number): number => {
    const bpm = midiPlayerRef.current?.currentBpm || 120;
    const ppq = midiPlayerRef.current?.ticksPerBeat || 480;
    if (bpm === 0 || ppq === 0) return 0.5;
    const secondsPerTick = 60 / (bpm * ppq);
    return durationInTicks * secondsPerTick;
  };

  const textStyle: LyricsCharacterStyle = {
    color: { color: "#FFF", colorBorder: "#00005E" },
    activeColor: { color: "red", colorBorder: "#00005E" },
    fontSize: 48,
  };
  return (
    <div className="w-full h-56 bg-black">
      <LyricsPlayer
        currentTick={currentTime}
        lyricsProcessed={lyricsProcessed}
      ></LyricsPlayer>
    </div>
  );
};

export default PreviewModal;
