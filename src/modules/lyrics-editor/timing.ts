import { LyricWordData } from "@/types/common.type";

export function calculateSeekTime(
  word: LyricWordData,
  lyricsData: LyricWordData[],
  _mode: string | null,
  index: number
): number {
  if (word.start !== null) return word.start;
  return (
    lyricsData
      .slice(0, index)
      .filter((item) => item.start !== null)
      .pop()?.start ?? 0
  );
}
