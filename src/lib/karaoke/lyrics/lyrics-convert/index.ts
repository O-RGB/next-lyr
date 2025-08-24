import { LyricEvent } from "@/modules/midi-klyr-parser/klyr-parser-lib";
import { LyricWordData } from "@/types/common.type";

export const mapWordDataToEvents = (
  value: LyricWordData[],
  tickToCursor?: (tick: number) => number
): LyricEvent[][] => {
  const convert = (tick: number) => (tickToCursor ? tickToCursor(tick) : tick);

  let newLyricsData: LyricEvent[][] = [];
  value.forEach((word: LyricWordData) => {
    if (!newLyricsData[word.lineIndex]) {
      newLyricsData[word.lineIndex] = [];
    }
    newLyricsData[word.lineIndex].push({
      text: word.name,
      tick: convert ? convert(word.start ?? 0) : word.start ?? 0,
    });
  });
  newLyricsData = newLyricsData.map((line) =>
    line.sort((a, b) => a.tick - b.tick)
  );
  return newLyricsData;
};

export const mapEventsToWordData = (
  lines: LyricEvent[][],
  cursorToTick?: (cursor: number) => number
): LyricWordData[] => {
  const convert = (tick: number) => (cursorToTick ? cursorToTick(tick) : tick);

  return lines.flatMap((line, lineIndex) =>
    line.map((event, index) => {
      const start = convert(event.tick);
      const next = line[index + 1];
      const end = next ? convert(next.tick) : null;

      return {
        name: event.text,
        start,
        end,
        length: end !== null ? end - start : 0,
        index,
        lineIndex,
      };
    })
  );
};
