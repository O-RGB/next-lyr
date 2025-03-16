export class CurBuilder {
  private values: number[][];
  private lyrics: string[][];
  private ticksPerBeat: number = 0;
  private bpm: number = 0;
  private cursor: number[] = [];

  constructor(
    values: number[][],
    lyrics: string[][],
    ticksPerBeat: number,
    bpm: number
  ) {
    this.values = values;
    this.lyrics = lyrics;
    this.ticksPerBeat = ticksPerBeat;
    this.bpm = bpm;
  }

  public generateSegment(
    lyric: string[],
    tick: number[],
    BPM: number
  ): number[] {
    const step = Math.round(864 / BPM);
    const timings: number[] = [];
    timings.push(tick[0]);
    lyric.forEach((word, i) => {
      for (let j = 0; j < word.length; j++) {
        if (i === lyric.length - 1) {
          timings.push(tick[i + 1] + j * step);
        } else {
          timings.push(tick[i + 1] + j);
        }
      }
    });

    return timings;
  }

  public getFileContent(): Uint8Array {
    const segmentsMulti = this.lyrics.map((lyric, i) =>
      this.generateSegment(
        this.lyrics[i],
        this.convertTicksToCursor(this.values[i]),
        this.bpm
      )
    );

    let tickToCur = segmentsMulti.flat();
    this.cursor = tickToCur;
    // console.log("ref data cursor data", tickToCur, tickToCur.length);

    const buffer = new Uint8Array(tickToCur.length * 2 + 1);
    let offset = 0;

    for (const value of tickToCur) {
      buffer[offset] = value & 0xff;
      buffer[offset + 1] = (value >> 8) & 0xff;
      offset += 2;
    }

    buffer[offset] = 0xff;
    return buffer;
  }

  public getCursor() {
    const segmentsMulti = this.lyrics.map((lyric, i) =>
      this.generateSegment(
        this.lyrics[i],
        this.convertTicksToCursor(this.values[i]),
        this.bpm
      )
    );

    return segmentsMulti.flat();
  }

  public downloadFile(filename: string): void {
    const content = this.getFileContent();
    const blob = new Blob([content], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
}

export const convertCursorToTicks = (
  ticksPerBeat: number,
  cursor: number[]
) => {
  if (ticksPerBeat === 0) {
    console.error("ticksPerBeat = 0");
    return [];
  }

  let curOnTick = cursor.map((data) => data * (ticksPerBeat / 24));
  return curOnTick;
};
