import { LyricWordData } from "@/types/common.type";
import { ThaiKaraoke } from "../thai-karaoke";

export function hasCompleteLyricTiming(
  lyricsData: LyricWordData[][]
): boolean {
  const words = lyricsData.flat();
  return words.length > 0 && words.every((word) => word.at !== null);
}

export function processRawLyrics(
  rawText: string,
  autoSub: boolean
): LyricWordData[] {
  const lines = rawText.split("\n");
  const words: LyricWordData[] = [];
  let globalWordIndex = 0;
  const thaiKaraoke = ThaiKaraoke.getInstance();

  lines.forEach((line, lineIndex) => {
    const lineWords = splitLyricLine(line);

    lineWords.forEach((wordText) => {
      let vocal = undefined;
      if (autoSub) {
        vocal = thaiKaraoke.transliterate(wordText).toUpperCase();
      }
      words.push({
        text: wordText,
        vocal: vocal,
        at: null,
        index: globalWordIndex++,
        lineIndex: lineIndex,
      });
    });
  });
  return words;
}

/**
 * Preserve an editor row when a source line contains no lyric token.
 * A placeholder is added only when splitting produced no content at all.
 */
export function splitLyricLine(line: string): string[] {
  const words = line.split("|").filter((word) => word !== "");
  return words.length > 0 ? words : [" "];
}
