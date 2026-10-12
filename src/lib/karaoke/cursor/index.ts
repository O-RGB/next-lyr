import { LyricWordData } from "@/types/common.type";
import { groupLyricsByLine } from "../lyrics/convert";
import { smoothedWordCursor } from "@next-karaoke/lyrics/core";
import { cursorToTick, tickToCursor } from "./units";

export {
  CURSOR_PPQ,
  cursorToTick,
  cursorToTicks,
  tickToCursor,
  ticksToCursor,
} from "./units";

export class TickLyricSegmentGenerator {
  private ticksPerBeat: number;
  private cursor: number[] = [];
  private buffer: Uint8Array | undefined;

  constructor(ppq: number) {
    this.ticksPerBeat = ppq;
  }

  generateSmoothedTimestamps(
    words: LyricWordData[],
    toUnitConverter: (time: number) => number,
    fromUnitConverter: (unit: number) => number,
    offsetTicks?: (tick: number) => number
  ): { finalTimestamps: number[]; finalUnits: number[] } {
    const lines = groupLyricsByLine(words);
    const generatedUnits: number[] = [];

    lines.forEach((line, lineIndex) => {
      if (line.length === 0) return;

      const tokens = line.map((word) => ({
        unit: toUnitConverter(
          (word.at ?? 0) + (offsetTicks ? offsetTicks?.(word.at ?? 0) : 0)
        ),
        text: word.text,
      }));

      const fullText = tokens.map((t) => t.text).join("");
      const nextLine = lines[lineIndex + 1];
      const nextGroupStartUnit =
        nextLine?.[0]?.at !== null && nextLine?.[0]?.at !== undefined
          ? toUnitConverter(
              nextLine[0].at +
                (offsetTicks ? offsetTicks?.(nextLine[0].at) : 0)
            )
          : null;

      const curve = smoothedWordCursor(tokens, nextGroupStartUnit);
      generatedUnits.push(curve.start, ...curve.values);
    });

    const finalTimestamps = generatedUnits.map((unit) =>
      fromUnitConverter(unit)
    );
    return { finalTimestamps, finalUnits: generatedUnits };
  }

  generateSegment(
    words: LyricWordData[],
    offsetTicks?: (tick: number) => number
  ): number[] {
    const { finalTimestamps, finalUnits } = this.generateSmoothedTimestamps(
      words,
      (tick) => tickToCursor(tick, this.ticksPerBeat),
      (cursor) => cursorToTick(cursor, this.ticksPerBeat),
      offsetTicks
    );
    this.cursor = finalUnits;
    return finalTimestamps;
  }

  public export = () => {
    console.log(this.cursor);
    if (this.cursor.length === 0) return;
    const buffer = new Uint8Array(this.cursor.length * 2 + 1);
    let offset = 0;

    for (const value of this.cursor) {
      buffer[offset] = value & 0xff;
      buffer[offset + 1] = (value >> 8) & 0xff;
      offset += 2;
    }

    buffer[offset] = 0xff;
    this.buffer = buffer;
    return buffer;
  };

  public downloadFile(filename: string): void {
    if (!this.buffer) this.export();
    if (!this.buffer) return;

    const blob = new Blob([this.buffer as BlobPart], {
      type: "application/octet-stream",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export class TimestampLyricSegmentGenerator {
  generateSegment(words: LyricWordData[]): number[] {
    const timings: number[] = [];
    if (words.length === 0) return timings;

    const easeInOut = (t: number) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const minCharSpacing = 0.001;
    const speedFactor = 1.2;
    const LONG_WORD_THRESHOLD_S = 0.7;
    let line = -1;

    words.forEach((word, i) => {
      const isNewLine = line !== word.lineIndex;
      const prevWord = words[i - 1];
      const nextWord = words[i + 1];

      if (isNewLine) {
        if (i > 0) {
          const midPointTime = word.at ?? prevWord.at ?? 0;
          timings.push(midPointTime);
        } else {
          timings.push(word.at ?? 0);
        }
        line = word.lineIndex;
      }

      let segmentDuration: number;
      if (nextWord && nextWord.lineIndex > word.lineIndex) {
        segmentDuration = ((nextWord.at ?? 0) - (word.at ?? 0)) / 2;
      } else {
        const nextAt = nextWord?.at ?? (word.at ?? 0) + 1;
        segmentDuration = nextAt - (word.at ?? 0);
      }

      const speedMultiplier =
        i === words.length - 1
          ? 0.9
          : segmentDuration > LONG_WORD_THRESHOLD_S
          ? 0.85
          : 0.95;

      const effectiveDuration =
        (segmentDuration * speedMultiplier) / speedFactor;

      const charsInWord = word.text.length;
      if (charsInWord === 0) return;

      let lastTime = word.at ?? 0;

      for (let j = 0; j < charsInWord; j++) {
        const t = j / (charsInWord - 1 || 1);
        let easedProgress = easeInOut(t);

        if (j === 0 && i > 0 && prevWord.lineIndex === word.lineIndex) {
          easedProgress = easeOutCubic(0);
        }

        let position = (word.at ?? 0) + easedProgress * effectiveDuration;

        if (position <= lastTime) {
          position = lastTime + minCharSpacing;
        }

        timings.push(position);
        lastTime = position;
      }
    });

    for (let i = 1; i < timings.length; i++) {
      if (timings[i] <= timings[i - 1]) {
        timings[i] = timings[i - 1] + minCharSpacing;
      }
    }

    return timings;
  }
}

export default { TickLyricSegmentGenerator, TimestampLyricSegmentGenerator };
