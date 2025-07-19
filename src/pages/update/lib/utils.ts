import { ExportData, LyricWordData } from "./type";

// [MODIFIED] Now includes lineIndex during processing
export function processRawLyrics(rawText: string): LyricWordData[] {
  const lines = rawText.trim().split("\n");
  const words: LyricWordData[] = [];
  let globalWordIndex = 0;

  lines.forEach((line, lineIndex) => {
    const lineWords = line
      .trim()
      .split(/(\s+|\|)/)
      .filter((w) => w.trim() !== "" && w !== "|");

    lineWords.forEach((wordText) => {
      words.push({
        name: wordText,
        start: null,
        end: null,
        length: 0,
        index: globalWordIndex++,
        lineIndex: lineIndex, // Assign the line number
      });
    });
  });
  return words;
}

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

//   const jsonString = JSON.stringify(exportData, null, 2);
//   const blob = new Blob([jsonString], { type: "application/json" });
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement("a");
//   a.href = url;
//   a.download = `${metadata.title.replace(/\s/g, "_") || "lyrics"}.json`;
//   document.body.appendChild(a);
//   a.click();
//   document.body.removeChild(a);
//   URL.revokeObjectURL(url);
}
