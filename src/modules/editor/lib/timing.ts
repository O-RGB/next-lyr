import { LyricWordData } from "@/types/common.type";

export function calculateSeekTime(
  word: LyricWordData,
  lyricsData: LyricWordData[],
  mode: string | null,
  index: number
): number | null {
  if (word.start !== null) return word.start;

  if (mode === "midi") {
    return lyricsData
      .slice(0, index)
      .filter((item) => item.start !== null)
      .pop()?.start ?? 0;
  }

  return (
    lyricsData
      .slice(0, index)
      .filter((item) => item.start !== null)
      .pop()?.start ?? 0
  );
}
