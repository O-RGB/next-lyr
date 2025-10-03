import { LyricWordData, ExportData } from "@/types/common.type";
import { ThaiKaraoke } from "../thai-karaoke";

export function processRawLyrics(
  rawText: string,
  autoSub: boolean
): LyricWordData[] {
  const lines = rawText.split("\n");
  const words: LyricWordData[] = [];
  let globalWordIndex = 0;
  const thaiKaraoke = ThaiKaraoke.getInstance();

  lines.forEach((line, lineIndex) => {
    // split โดยใช้ '|' แต่ยังคงช่องว่างเดิมของคำ
    const lineWords = line
      .split("|")
      .map((w) => w) // ไม่ trim
      .filter((w) => w !== "");

    lineWords.forEach((wordText) => {
      let vocal = undefined;
      if (autoSub) {
        vocal = thaiKaraoke.transliterate(wordText).toUpperCase();
      }
      words.push({
        text: wordText,
        vocal: vocal,
        start: null,
        end: null,
        length: 0,
        index: globalWordIndex++,
        lineIndex: lineIndex,
      });
    });
  });
  return words;
}
