import { LyricWordData } from "@/types/common.type";
import type { IMidiParseResult } from "@/lib/karaoke/midi/types";
import type { MusicMode } from "@/types/common.type";

/** Small audible lead-in so the first onset is not cut off by a seek. */
export const PLAYBACK_SEEK_LEAD_SECONDS = 0.1;

export function calculateSeekTime(
  word: LyricWordData,
  lyricsData: LyricWordData[]
): number {
  if (word.at !== null) return word.at;

  const wordPosition = lyricsData.findIndex(
    (candidate) => candidate.index === word.index
  );
  if (wordPosition < 0) return 0;

  // An untimed word belongs to its line. Start that line from its first
  // available timestamp instead of jumping back to an arbitrary earlier word.
  const lineStart = lyricsData.find(
    (candidate) => candidate.lineIndex === word.lineIndex && candidate.at !== null
  )?.at;
  if (lineStart !== undefined && lineStart !== null) return lineStart;

  // If the complete line is untimed, continue from the end of the nearest
  // timed word before it. Using its end avoids replaying the previous line.
  const previousTimed = [...lyricsData.slice(0, wordPosition)]
    .reverse()
    .find((candidate) => candidate.at !== null);
  return previousTimed?.at ?? 0;
}

/**
 * Move the transport slightly before a requested lyric position while
 * keeping the lyric highlight anchored to the requested position.
 *
 * MIDI lyrics are stored in ticks, so the lead-in must be converted using the
 * tempo active at the target tick. Audio/video positions are already seconds.
 */
export function calculatePlaybackSeekTime(
  targetTime: number,
  mode: MusicMode | null,
  midi: IMidiParseResult | null,
  leadInSeconds = PLAYBACK_SEEK_LEAD_SECONDS
): number {
  if (targetTime <= 0) return 0;

  if (mode === "midi") {
    const ppq = Math.max(1, midi?.ticksPerBeat ?? 1);
    const tempo =
      [...(midi?.tempos.ranges ?? [])]
        .reverse()
        .find((range) => range.value.value.tick <= targetTime)?.value.value
        .bpm ?? 120;
    // Keep one extra small safety margin beyond the engine's start lead. This
    // prevents a dense line's first timestamp from being crossed before the
    // first presentation-clock sample arrives.
    const leadInTicks =
      ((leadInSeconds + PLAYBACK_SEEK_LEAD_SECONDS) * ppq * tempo) / 60;
    return Math.max(0, targetTime - leadInTicks);
  }

  return Math.max(0, targetTime - leadInSeconds);
}
