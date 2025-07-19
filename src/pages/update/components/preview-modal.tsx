import React, { useEffect, useRef, useState } from "react";
import { Modal } from "./common/modal";
import LyricsCharacter, { LyricsCharacterStyle } from "./lyrics-character";
import { MidiPlayerRef } from "../modules/js-synth";

type Props = {
  timestamps: number[];
  lyrics: string[][];
  mode: "mp3" | "midi";
  audioRef: React.RefObject<HTMLAudioElement | null>;
  midiPlayerRef: React.RefObject<MidiPlayerRef>;
  onClose: () => void;
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
  const [wordStartTimes, setWordStartTimes] = useState<number[][]>([]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let index = 0;
    const newWordStartTimes = lyrics.map((line) =>
      line.map((word) => {
        const startTime = timestamps[index] ?? 0;
        index += word.length;
        return startTime;
      })
    );
    setWordStartTimes(newWordStartTimes);
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

  if (wordStartTimes.length === 0) return null;

  return (
    <Modal title="Karaoke Preview" onClose={onClose}>
      <div className="overflow-y-auto p-4 bg-slate-900 text-center font-semibold">
        <div className="flex flex-col justify-center items-center h-full min-h-[300px]">
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
                  nextWordTime ??
                  nextLineFirstWordTime ??
                  startTime + (mode === "midi" ? 480 : 1);

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
                  <div key={wordIndex}>
                    <LyricsCharacter
                      lyr={word}
                      status={status}
                      duration={Math.max(0.05, durationInSeconds)}
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
