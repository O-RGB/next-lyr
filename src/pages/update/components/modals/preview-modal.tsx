import React, { useEffect, useRef, useState } from "react";
import { Modal } from "../common/modal";
import LyricsCharacter, {
  LyricsCharacterStyle,
} from "../lyrics/lyrics-character";
import { MidiPlayerRef } from "../../modules/js-synth";

type Props = {
  timestamps: number[];
  lyrics: string[][];
  mode: "mp3" | "midi";
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

  if (processedLyrics.length === 0) return null;

  return (
    <Modal title="Karaoke Preview" onClose={onClose}>
      <div className="overflow-y-auto p-4 bg-slate-900 text-center font-semibold">
        <div className="flex flex-col justify-center items-center h-full min-h-[300px]">
          {processedLyrics.map((line, lineIndex) => (
            <div
              key={lineIndex}
              className="flex flex-row flex-wrap justify-center my-2"
            >
              {line.map((word, wordIndex) => {
                const { text, startTime, endTime } = word;

                let durationInSeconds = 0;
                if (mode === "mp3") {
                  durationInSeconds = endTime - startTime;
                } else {
                  durationInSeconds = convertTickDurationToSeconds(
                    endTime - startTime
                  );
                }

                let status: "inactive" | "active" | "completed" = "inactive";
                if (currentTime >= startTime && currentTime < endTime) {
                  status = "active";
                } else if (currentTime >= endTime) {
                  status = "completed";
                }

                return (
                  <div
                    key={wordIndex}
                    className="flex flex-col text-white text-[8px]"
                  >
                    <LyricsCharacter
                      lyr={text}
                      status={status}
                      duration={Math.max(0, durationInSeconds)}
                      fontSize={textStyle.fontSize}
                      color={textStyle.color}
                      activeColor={textStyle.activeColor}
                    />
                    ​
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
