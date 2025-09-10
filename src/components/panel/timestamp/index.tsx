import { useKaraokeStore } from "@/stores/karaoke-store";
import React, { useMemo } from "react";
import BeatIndicator from "./beat-indicator";

interface TimeStampeProps {}

const TimeStampe: React.FC<TimeStampeProps> = ({}) => {
  const currentTime = useKaraokeStore((state) => state.currentTime);
  const currentTempo = useKaraokeStore((state) => state.currentTempo);
  const mode = useKaraokeStore((state) => state.mode);
  const midi = useKaraokeStore((state) => state.playerState.midi);

  const currentBeat = useMemo(() => {
    if (mode !== "midi" || !midi || !midi.ticksPerBeat) {
      return -1;
    }

    const firstNoteTick = midi.firstNote;
    if (currentTime < firstNoteTick) {
      return -1;
    }

    const ticksPerBeat = midi.ticksPerBeat;
    const timeSignatureNumerator = 4;

    const ticksSinceFirstNote = currentTime - firstNoteTick;

    const beatInMeasure =
      Math.floor(ticksSinceFirstNote / ticksPerBeat) % timeSignatureNumerator;

    return beatInMeasure;
  }, [currentTime, midi, mode]);

  return (
    <div className="flex gap-2 items-center">
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
      <div className="flex items-center gap-4 p-1 px-3 bg-black rounded-md text-white font-mono text-sm">
        {currentTempo} BPM.
      </div>
    </div>
  );
};

export default TimeStampe;
