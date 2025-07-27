import { LyricWordData, ExportData } from "@/types/common.type";

export const convertCursorToTick = (
  cursorValue: number,
  ppq: number
): number => {
  if (ppq === 0) {
    console.error("PPQ (ticksPerBeat) cannot be zero.");
    return 0;
  }

  console.log("ppq", ppq);
  const originalTick = (cursorValue * ppq) / 24;
  return originalTick;
};
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

// Moved createAndDownloadJSON here to make it a utility function
// It can then be called directly or integrated into the store actions if preferred.
export function createAndDownloadJSON(
  lyrics: LyricWordData[],
  metadata: { title: string; artist: string }
) {
  if (lyrics.length === 0) {
    alert("No lyrics data to export.");
    return;
  }

  const exportData: ExportData = {
    title: metadata.title || "Untitled",
    artist: metadata.artist || "Unknown Artist",
    lyrics: lyrics
      .filter((word) => word.start !== null && word.end !== null)
      .map(({ name, start, end, length }) => ({
        name,
        start: parseFloat(start!.toFixed(3)),
        end: parseFloat(end!.toFixed(3)),
        length: parseFloat(length.toFixed(3)),
      })),
  };

  return exportData;
}
