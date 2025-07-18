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

    // เพิ่มเวลาเริ่มต้น
    timings.push(tick[0]);

    // ตรวจสอบว่ามีข้อมูลที่จำเป็นหรือไม่
    const totalCharacters = lyric.reduce((sum, word) => sum + word.length, 0);
    if (totalCharacters === 0 || tick.length <= 1) {
      return timings;
    }

    // คำนวณเวลาต่อบีท
    const msPerBeat = 60000 / BPM;

    // ใช้ easing function ที่เรียบง่ายและเร็วขึ้น
    const easeInOut = (t: number): number => {
      // ลดความโค้งลงเพื่อให้ตัวอักษรปรากฏเร็วขึ้น
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    };

    // ลดค่าขั้นต่ำของระยะห่างระหว่างตัวอักษร
    const minCharSpacing = 3; // ค่าคงที่ต่ำๆ เพื่อให้ตัวอักษรปรากฏเร็วขึ้น

    // เพิ่มความเร็วโดยรวม
    const speedFactor = 1.2; // ค่ามากกว่า 1 = เร็วขึ้น

    lyric.forEach((word, i) => {
      if (i >= lyric.length || i + 1 >= tick.length) return;

      const startTime = tick[i + 1];
      const endTime = i + 2 < tick.length ? tick[i + 2] : tick[tick.length - 1];
      const segmentDuration = endTime - startTime;

      // ปรับความเร็วให้เร็วขึ้นมาก
      let speedMultiplier: number;

      // ทุกส่วนเร็วขึ้น
      if (i === lyric.length - 1) {
        // ท่อนสุดท้าย
        speedMultiplier = 0.9;
      } else if (segmentDuration > msPerBeat * 2) {
        // ท่อนที่ยาว
        speedMultiplier = 0.85;
      } else {
        // ท่อนทั่วไป
        speedMultiplier = 0.95;
      }

      // ทำให้เวลาที่ใช้ในการแสดงตัวอักษรสั้นลง (เร็วขึ้น)
      const effectiveDuration =
        (segmentDuration * speedMultiplier) / speedFactor;

      const charsInWord = word.length;
      if (charsInWord === 0) return;

      let lastTime = startTime;

      // กระจายตัวอักษรให้เร็วขึ้น
      for (let j = 0; j < charsInWord; j++) {
        const progress = j / (charsInWord - 1 || 1);
        const easedProgress = easeInOut(progress);

        // ลดหรือตัด beatAdjustment ออกเพื่อให้เร็วขึ้น
        const beatAdjustment = 0;

        // คำนวณเวลาใหม่ที่เร็วขึ้น
        let position = Math.round(
          startTime + easedProgress * effectiveDuration
        );

        // ตรวจสอบระยะห่างขั้นต่ำ (ใช้ค่าน้อยมาก)
        if (position <= lastTime) {
          position = lastTime + minCharSpacing;
        }

        timings.push(position);
        lastTime = position;
      }
    });

    // ตรวจสอบอีกครั้งเพื่อให้แน่ใจว่าไม่มีตัวเลขซ้ำกัน
    for (let i = 1; i < timings.length; i++) {
      if (timings[i] <= timings[i - 1]) {
        timings[i] = timings[i - 1] + 1; // เพิ่มแค่ 1 ms เพื่อให้เร็วที่สุด
      }
    }

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
