import { LyricWordData, ExportData } from "@/types/common.type";

export function processRawLyrics(rawText: string): LyricWordData[] {
  const lines = rawText.split("\n");
  const words: LyricWordData[] = [];
  let globalWordIndex = 0;

  lines.forEach((line, lineIndex) => {
    // split โดยใช้ '|' แต่ยังคงช่องว่างเดิมของคำ
    const lineWords = line
      .split("|")
      .map((w) => w) // ไม่ trim
      .filter((w) => w !== "");

    lineWords.forEach((wordText) => {
      words.push({
        name: wordText,
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
