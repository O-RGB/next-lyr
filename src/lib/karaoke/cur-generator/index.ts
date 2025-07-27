import { LyricWordData } from "@/types/common.type";

interface LyricSegmentGenerator {
  generateSegment(words: LyricWordData[]): number[];
}

export class TickLyricSegmentGenerator implements LyricSegmentGenerator {
  private msPerBeat: number;
  private ticksPerBeat: number;
  private cursor: number[] = [];
  private buffer: Uint8Array<ArrayBuffer> | undefined;

  constructor(BPM: number, ppq: number) {
    this.msPerBeat = 60000 / BPM;
    this.ticksPerBeat = ppq;
  }

  private convertTicksToCursor = (value: number[]) => {
    if (this.ticksPerBeat === 0) {
      console.error("ticksPerBeat = 0");
      return [];
    }

    let cursor = value.map((tick) =>
      Math.round(tick / (this.ticksPerBeat / 24))
    );
    return cursor;
  };

  public export = () => {
    if (this.cursor.length === 0) return;
    const tickToCur = this.convertTicksToCursor(this.cursor);
    const buffer = new Uint8Array(tickToCur.length * 2 + 1);
    let offset = 0;

    for (const value of tickToCur) {
      buffer[offset] = value & 0xff;
      buffer[offset + 1] = (value >> 8) & 0xff;
      offset += 2;
    }

    buffer[offset] = 0xff;
    this.buffer = buffer;
    return buffer;
  };

  public downloadFile(filename: string): void {
    if (!this.buffer) return;
    const blob = new Blob([this.buffer], {
      type: "application/octet-stream",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  generateSegment(words: LyricWordData[]): number[] {
    const timings: number[] = [];
    if (words.length === 0) return timings;

    const easeInOut = (t: number) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const minCharSpacing = 3;
    const speedFactor = 1.2;
    let line = -1;

    words.forEach((word, i) => {
      const isNewLine = line !== word.lineIndex;
      const prevWord = words[i - 1];
      const nextWord = words[i + 1];

      // Midpoint transition between lines
      if (isNewLine) {
        if (i > 0) {
          const midPointTime = Math.round(
            ((prevWord.end ?? 0) + (word.start ?? 0)) / 2
          );
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
          : segmentDuration > this.msPerBeat * 2
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

        // Smooth in from previous word
        if (j === 0 && i > 0 && prevWord.lineIndex === word.lineIndex) {
          easedProgress = easeOutCubic(0); // first char, ease into this word
        }

        let position = Math.round(
          (word.start ?? 0) + easedProgress * effectiveDuration
        );

        if (position <= lastTime) position = lastTime + minCharSpacing;
        timings.push(position);
        lastTime = position;
      }
    });

    // Enforce monotonicity
    for (let i = 1; i < timings.length; i++) {
      if (timings[i] <= timings[i - 1]) {
        timings[i] = timings[i - 1] + 1;
      }
    }

    this.cursor = timings;
    return timings;
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
          easedProgress = easeOutCubic(0); // smooth in
        }

        let position = (word.start ?? 0) + easedProgress * effectiveDuration;

        if (position <= lastTime) {
          position = lastTime + minCharSpacing;
        }

        timings.push(position);
        lastTime = position;
      }
    });

    // Ensure increasing
    for (let i = 1; i < timings.length; i++) {
      if (timings[i] <= timings[i - 1]) {
        timings[i] = timings[i - 1] + minCharSpacing;
      }
    }

    console.log("timings", timings);
    return timings;
  }
}

export default { TickLyricSegmentGenerator, TimestampLyricSegmentGenerator };
