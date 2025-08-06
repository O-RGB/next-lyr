import { useKaraokeStore } from "@/stores/karaoke-store";
import React, { useMemo } from "react";
import BeatIndicator from "./beat-indicator";

interface TimeStampeProps {}

const TimeStampe: React.FC<TimeStampeProps> = ({}) => {
  const currentTime = useKaraokeStore((state) => state.currentTime);
  const mode = useKaraokeStore((state) => state.mode);
  const midiInfo = useKaraokeStore((state) => state.playerState.midiInfo);

  const currentBeat = useMemo(() => {
    if (mode !== "midi" || !midiInfo || !midiInfo.ppq) {
      return -1;
    }

    const firstNoteTick = midiInfo.raw.firstNoteOnTick ?? 0;
    if (currentTime < firstNoteTick) {
      return -1;
    }

    const ticksPerBeat = midiInfo.ppq;
    const timeSignatureNumerator = 4;

    const ticksSinceFirstNote = currentTime - firstNoteTick;

    const beatInMeasure =
      Math.floor(ticksSinceFirstNote / ticksPerBeat) % timeSignatureNumerator;

    return beatInMeasure;
  }, [currentTime, midiInfo, mode]);

  return (
    <div className="flex items-center gap-4 p-1 px-3 bg-black rounded-md text-white font-mono text-sm">
      {currentBeat !== -1 && <BeatIndicator currentBeat={currentBeat} />}

      <div className="flex items-center">
        <span className="text-[10px] mr-1">
          {mode === "midi" ? "Tick:" : "Time:"}
        </span>
        <span>
          {mode === "midi" ? Math.round(currentTime) : currentTime.toFixed(2)}
        </span>
      </div>
    </div>
  );
};

export default TimeStampe;
