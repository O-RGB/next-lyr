import { LyricWordData } from "@/types/common.type";

export function calculateSeekTime(
  word: LyricWordData,
  lyricsData: LyricWordData[]
): number {
  if (word.start !== null) return word.start;

  const wordPosition = lyricsData.findIndex(
    (candidate) => candidate.index === word.index
  );
  if (wordPosition < 0) return 0;

  // An untimed word belongs to its line. Start that line from its first
  // available timestamp instead of jumping back to an arbitrary earlier word.
  const lineStart = lyricsData
    .slice(0, wordPosition + 1)
    .find(
      (candidate) =>
        candidate.lineIndex === word.lineIndex && candidate.start !== null
    )?.start;
  if (lineStart !== undefined && lineStart !== null) return lineStart;

  // If the complete line is untimed, continue from the end of the nearest
  // timed word before it. Using its end avoids replaying the previous line.
  const previousTimed = [...lyricsData.slice(0, wordPosition)]
    .reverse()
    .find((candidate) => candidate.end !== null || candidate.start !== null);
  if (previousTimed?.end !== null && previousTimed?.end !== undefined) {
    return previousTimed.end;
  }
  return previousTimed?.start ?? 0;
}
