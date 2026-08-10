import { useKaraokeStore } from "@/stores/karaoke-store";
import React, { useMemo } from "react";
import BeatIndicator from "./beat-indicator";

const DEFAULT_TIME_SIGNATURE = { tick: 0, numerator: 4, denominator: 4 };
const EMPTY_TIME_SIGNATURES: typeof DEFAULT_TIME_SIGNATURE[] = [];

interface TimeStampeProps {}

const TimeStampe: React.FC<TimeStampeProps> = ({}) => {
  const currentTime = useKaraokeStore((state) => state.currentTime);
  const currentTempo = useKaraokeStore((state) => state.currentTempo);
  const mode = useKaraokeStore((state) => state.mode);
  const ticksPerBeat = useKaraokeStore(
    (state) => state.playerState.midi?.ticksPerBeat ?? 0
  );
  const timeSignatures =
    useKaraokeStore((state) => state.playerState.midi?.timeSignatures) ??
    EMPTY_TIME_SIGNATURES;

  const currentBeat = useMemo(() => {
    if (mode !== "midi" || !ticksPerBeat) {
      return -1;
    }

    const signature = timeSignatures.reduce(
      (current, candidate) =>
        candidate.tick <= currentTime ? candidate : current,
      DEFAULT_TIME_SIGNATURE
    );
    const ticksPerSignatureBeat =
      ticksPerBeat * (4 / signature.denominator);
    const ticksPerMeasure = ticksPerSignatureBeat * signature.numerator;
    const ticksIntoMeasure =
      Math.max(0, currentTime - signature.tick) % ticksPerMeasure;
    const beatInMeasure = Math.floor(
      ticksIntoMeasure / ticksPerSignatureBeat
    );

    return beatInMeasure;
  }, [currentTime, mode, ticksPerBeat, timeSignatures]);

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
      <div className="flex items-center gap-1 p-1 px-3 bg-black rounded-md text-white font-mono text-sm">
        <span className="text-[10px]">BPM:</span>
        <span>{currentTempo}</span>
      </div>
    </div>
  );
};

export default TimeStampe;
