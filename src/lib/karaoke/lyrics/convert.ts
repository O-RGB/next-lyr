import { LyricWordData } from "@/types/common.type";
import { LyricEvent } from "../midi/types";

export function groupLyricsByLine(words: LyricWordData[]): LyricWordData[][] {
  const groupedLyrics: LyricWordData[][] = [];
  for (const word of words) {
    if (!groupedLyrics[word.lineIndex]) {
      groupedLyrics[word.lineIndex] = [];
    }
    groupedLyrics[word.lineIndex].push(word);
  }
  return groupedLyrics;
}

export function groupWordDataToEvents(
  words: LyricWordData[],
  tickConverter?: (tick: number) => number
): LyricEvent[][] {
  const groupedEvents: LyricEvent[][] = [];
  for (const word of words) {
    if (!groupedEvents[word.lineIndex]) {
      groupedEvents[word.lineIndex] = [];
    }
    const tick = tickConverter
      ? tickConverter(word.start ?? 0)
      : word.start ?? 0;
    groupedEvents[word.lineIndex].push({
      text: word.name,
      tick: Math.round(tick),
    });
  }

  return groupedEvents.map((line) => line.sort((a, b) => a.tick - b.tick));
}

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
