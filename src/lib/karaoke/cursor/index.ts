import { LyricWordData } from "@/types/common.type";
import { groupLyricsByLine } from "../lyrics/convert";
import { clustersFromText } from "./lib";

/**
 * Converts a single cursor value to a MIDI tick value.
 * @param cur The cursor value.
 * @param ppq Pulses Per Quarter Note (ticks per beat) for the MIDI file.
 * @returns The calculated tick value.
 */
export const cursorToTick = (cur: number, ppq: number): number => {
  if (ppq === 0) return 0;
  return (cur * ppq) / 24;
};

/**
 * Converts a single MIDI tick value to a cursor value.
 * @param tick The tick value.
 * @param ppq Pulses Per Quarter Note (ticks per beat) for the MIDI file.
 * @returns The calculated cursor value.
 */
export const tickToCursor = (tick: number, ppq: number): number => {
  if (ppq === 0) return 0;
  return Math.round(tick / (ppq / 24));
};

/**
 * Converts an array of cursor values to an array of MIDI tick values.
 * @param cursor The array of cursor values.
 * @param ppq Pulses Per Quarter Note (ticks per beat).
 * @returns The array of calculated tick values.
 */
export const cursorToTicks = (cursor: number[], ppq: number): number[] => {
  return cursor.map((cur) => cursorToTick(cur, ppq));
};

interface LyricSegmentGenerator {
  generateSegment(words: LyricWordData[], offsetTicks?: number): number[];
}

export class TickLyricSegmentGenerator implements LyricSegmentGenerator {
  private ticksPerBeat: number;
  private cursor: number[] = [];
  private buffer: Uint8Array | undefined;

  constructor(BPM: number, ppq: number) {
    this.ticksPerBeat = ppq;
  }

  private DEFAULT_MEDIAN_R = 0.2;
  private DEFAULT_CHAR_SPAN = 4;
  private EASE_POWER = 0.95;

  /**
   * Core function to generate smoothed timestamps for a set of lyrics.
   * It is unit-agnostic (works with ticks, ms, etc.) by using converter functions.
   * @param words The flat array of all lyric words.
   * @param toUnitConverter A function to convert a word's start time to the calculation unit (e.g., tick to cursor).
   * @param fromUnitConverter A function to convert a calculation unit back to the original time unit.
   * @returns An object containing final smoothed timestamps and the units used for calculation.
   */
  generateSmoothedTimestamps(
    words: LyricWordData[],
    toUnitConverter: (time: number) => number,
    fromUnitConverter: (unit: number) => number,
    offsetTicks: number = 0
  ): { finalTimestamps: number[]; finalUnits: number[] } {
    const lines = groupLyricsByLine(words);
    const generatedUnits: number[] = [];

    lines.forEach((line, lineIndex) => {
      if (line.length === 0) return;

      const tokens = line.map((word) => ({
        unit: toUnitConverter((word.start ?? 0) + offsetTicks),
        text: word.name,
      }));

      const fullText = tokens.map((t) => t.text).join("");
      const nextLine = lines[lineIndex + 1];
      const nextGroupStartUnit =
        nextLine?.[0]?.start !== null && nextLine?.[0]?.start !== undefined
          ? toUnitConverter(nextLine[0].start + offsetTicks)
          : null;

      const lastTokenUnit = tokens[tokens.length - 1].unit;
      let groupEndUnit: number;

      if (nextGroupStartUnit !== null) {
        const gap = nextGroupStartUnit - lastTokenUnit;
        if (gap <= 0) {
          groupEndUnit =
            lastTokenUnit +
            Math.max(
              1,
              this.DEFAULT_CHAR_SPAN *
                Math.max(1, Math.floor(fullText.length / 5))
            );
        } else {
          groupEndUnit =
            lastTokenUnit +
            Math.max(1, Math.floor(this.DEFAULT_MEDIAN_R * gap));
        }
      } else {
        groupEndUnit =
          lastTokenUnit +
          Math.max(
            1,
            this.DEFAULT_CHAR_SPAN *
              Math.max(1, Math.floor(fullText.length / 4))
          );
      }

      const charUnits: number[] = [];
      const bounds: { lower: number; upper: number }[] = [];

      tokens.forEach((tok, i_tok) => {
        const startUnit = tok.unit;
        const stopUnit =
          i_tok + 1 < tokens.length ? tokens[i_tok + 1].unit : groupEndUnit;

        const clusters = clustersFromText(tok.text);
        const nBase = Math.max(1, clusters.length);

        const clusterVals: number[] = [];
        if (nBase === 1) {
          clusterVals.push(startUnit);
        } else {
          for (let i = 0; i < nBase; i++) {
            let frac = i / nBase;
            frac = Math.pow(frac, this.EASE_POWER);
            const mapped = startUnit + frac * (stopUnit - startUnit);
            clusterVals.push(mapped);
          }
        }

        clusters.forEach((cl) => {
          const val = clusterVals.shift() ?? startUnit;
          cl.chars.forEach(() => {
            charUnits.push(val);
            bounds.push({ lower: startUnit, upper: stopUnit - 1 });
          });
        });
      });

      let ints = charUnits.map((p, i) => {
        const bound = bounds[i];
        return Math.min(Math.max(Math.round(p), bound.lower), bound.upper);
      });

      for (let i = 1; i < ints.length; i++) {
        if (ints[i] < ints[i - 1]) {
          ints[i] = ints[i - 1];
        }
      }

      if (ints.length > 0) {
        ints[ints.length - 1] = Math.round(groupEndUnit);
      }

      if (tokens.length > 0) {
        generatedUnits.push(tokens[0].unit);
      }
      generatedUnits.push(...ints);
    });

    const finalTimestamps = generatedUnits.map((unit) =>
      fromUnitConverter(unit)
    );
    return { finalTimestamps, finalUnits: generatedUnits };
  }

  generateSegment(words: LyricWordData[], offsetTicks: number = 0): number[] {
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

export class TimestampLyricSegmentGenerator implements LyricSegmentGenerator {
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
          const midPointTime = ((prevWord.end ?? 0) + (word.start ?? 0)) / 2;
          timings.push(midPointTime);
        } else {
          timings.push(word.start ?? 0);
        }
        line = word.lineIndex;
      }

      let segmentDuration: number;
      if (nextWord && nextWord.lineIndex > word.lineIndex) {
        segmentDuration = ((nextWord.start ?? 0) - (word.start ?? 0)) / 2;
      } else {
        segmentDuration = (word.end ?? 0) - (word.start ?? 0);
      }

      const speedMultiplier =
        i === words.length - 1
          ? 0.9
          : segmentDuration > LONG_WORD_THRESHOLD_S
          ? 0.85
          : 0.95;

      const effectiveDuration =
        (segmentDuration * speedMultiplier) / speedFactor;

      const charsInWord = word.name.length;
      if (charsInWord === 0) return;

      let lastTime = word.start ?? 0;

      for (let j = 0; j < charsInWord; j++) {
        const t = j / (charsInWord - 1 || 1);
        let easedProgress = easeInOut(t);

        if (j === 0 && i > 0 && prevWord.lineIndex === word.lineIndex) {
          easedProgress = easeOutCubic(0);
        }

        let position = (word.start ?? 0) + easedProgress * effectiveDuration;

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
