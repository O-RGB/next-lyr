import { ArrayRange } from "@/lib/utils/arrayrange";
import { TempoEvent } from "../../midi/types";

export const tempoToArrayRange = (
  tempoChange: TempoEvent[],
  maxTick: number
): ArrayRange<TempoEvent> => {
  const arrayRange = new ArrayRange<TempoEvent>();

  for (let i = 0; i < tempoChange.length; i++) {
    const current = tempoChange[i];
    const next = tempoChange[i + 1];
    if (next) {
      arrayRange.push([current.tick, next.tick], current);
    } else {
      arrayRange.push([current.tick, maxTick], current);
    }
  }

  return arrayRange;
};
