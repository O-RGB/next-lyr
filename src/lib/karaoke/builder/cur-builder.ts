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
    const timings: number[] = [];

    // เก็บ tick แรกไว้
    timings.push(tick[0]);

    // หาจำนวนอักขระทั้งหมด
    const totalCharacters = lyric.reduce((sum, word) => sum + word.length, 0);

    if (totalCharacters === 0 || tick.length <= 1) {
      return timings;
    }

    let currentPosition = 0;

    // วนลูปคำทั้งหมด
    lyric.forEach((word, i) => {
      // ถ้าไม่ใช่คำสุดท้าย และมีคำถัดไป
      if (i < lyric.length - 1) {
        const startTime = tick[i + 1];
        const endTime = tick[i + 2];
        const segmentDuration = endTime - startTime;

        // กระจายเวลาสำหรับแต่ละตัวอักษร แต่ช้ากว่าเดิม
        const slowFactor = 0.7; // ปรับความช้า (ค่า < 1 ทำให้ช้าลง)
        const effectiveDuration = segmentDuration * slowFactor;

        // กำหนดขนาดสเต็ป
        const charsInWord = word.length;
        const stepSize = charsInWord > 0 ? effectiveDuration / charsInWord : 0;

        // เพิ่มเวลาสำหรับแต่ละตัวอักษร
        for (let j = 0; j < charsInWord; j++) {
          const position = Math.round(startTime + j * stepSize);
          timings.push(position);
        }
      }
      // สำหรับคำสุดท้าย
      else if (i === lyric.length - 1 && i + 1 < tick.length) {
        const startTime = tick[i + 1];
        const endTime = tick[tick.length - 1];
        const segmentDuration = endTime - startTime;

        // คำสุดท้ายเคลื่อนไหวช้ากว่าปกติ
        const finalSlowFactor = 0.6; // คำสุดท้ายช้ากว่า
        const effectiveDuration = segmentDuration * finalSlowFactor;

        const charsInWord = word.length;
        const stepSize = charsInWord > 0 ? effectiveDuration / charsInWord : 0;

        for (let j = 0; j < charsInWord; j++) {
          const position = Math.round(startTime + j * stepSize);
          timings.push(position);
        }
      }
    });

    return timings;
  }

  public getFileContent(): Uint8Array {
    console.log("Cursor Position: ", this.values);
    const segmentsMulti = this.lyrics.map((lyric, i) =>
      this.generateSegment(this.lyrics[i], this.values[i], this.bpm)
    );

    let tickToCur = this.convertTicksToCursor(segmentsMulti.flat());
    this.cursor = tickToCur;

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
      this.generateSegment(this.lyrics[i], this.values[i], this.bpm)
    );
    return this.convertTicksToCursor(segmentsMulti.flat());
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
