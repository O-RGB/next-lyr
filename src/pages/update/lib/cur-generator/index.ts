import { LyricWordData } from "../../types/type";

interface LyricSegmentGenerator {
  generateSegment(words: LyricWordData[]): number[];
}

export class TickLyricSegmentGenerator implements LyricSegmentGenerator {
  private BPM: number;
  private msPerBeat: number;

  constructor(BPM: number) {
    this.BPM = BPM;
    this.msPerBeat = 60000 / BPM;
  }

  generateSegment(words: LyricWordData[]): number[] {
    const timings: number[] = [];

    if (words.length === 0) return timings;

    const easeInOut = (t: number): number =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const minCharSpacing = 3;
    const speedFactor = 1.2;
    let line = -1;

    words.forEach((word, i) => {
      // ส่วนที่ 1: เพิ่มจุดคั่นระหว่างบรรทัด (ทำงานเหมือนเดิม)
      if (line !== word.lineIndex) {
        if (i > 0) {
          const prevWord = words[i - 1];
          const midPointTime = Math.round(
            ((prevWord.end ?? 0) + (word.start ?? 0)) / 2
          );
          timings.push(midPointTime);
        } else {
          timings.push(word.start ?? 0);
        }
        line = word.lineIndex;
      }

      // ส่วนที่ 2: สร้าง timing ของตัวอักษร โดยเพิ่มเงื่อนไขพิเศษ
      let segmentDuration: number;
      const nextWord = words[i + 1];

      // ✨ ตรวจสอบว่าคำนี้เป็นคำสุดท้ายของบรรทัดหรือไม่
      if (nextWord && nextWord.lineIndex > word.lineIndex) {
        // ถ้าใช่, ใช้สูตร "หาร 2" เพื่อให้แอนิเมชันจบเร็วขึ้น
        segmentDuration = ((nextWord.start ?? 0) - (word.start ?? 0)) / 2;
      } else {
        // ถ้าไม่ใช่, ใช้ระยะเวลาปกติ
        segmentDuration = (word.end ?? 0) - (word.start ?? 0);
      }

      // --- ส่วนที่เหลือทำงานเหมือนเดิมโดยใช้ segmentDuration ที่ถูกเลือกไว้ ---
      let speedMultiplier =
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
        const progress = j / (charsInWord - 1 || 1);
        const easedProgress = easeInOut(progress);

        let position = Math.round(
          (word.start ?? 0) + easedProgress * effectiveDuration
        );

        if (position <= lastTime) position = lastTime + minCharSpacing;

        timings.push(position);
        lastTime = position;
      }
    });

    // ตรวจสอบให้แน่ใจว่าค่า timing เรียงจากน้อยไปมากเสมอ
    for (let i = 1; i < timings.length; i++) {
      if (timings[i] <= timings[i - 1]) {
        timings[i] = timings[i - 1] + 1;
      }
    }

    console.log("Total timings:", timings.length);
    return timings;
  }
}

export class TimestampLyricSegmentGenerator implements LyricSegmentGenerator {
  generateSegment(words: LyricWordData[]): number[] {
    const timings: number[] = [];

    if (words.length === 0) return timings;

    const easeInOut = (t: number): number =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const minCharSpacing = 0.001; // หน่วยวินาที
    const speedFactor = 1.2;
    let line = -1;

    // ค่าคงที่สำหรับพิจารณาว่าเป็นคำที่ "ยาว" (หน่วยวินาที)
    const LONG_WORD_THRESHOLD_S = 0.7;

    words.forEach((word, i) => {
      // ✨ Step 1: เพิ่มจุดคั่นระหว่างบรรทัด (ทำงานเหมือน Tick Mode) ✨
      if (line !== word.lineIndex) {
        if (i > 0) {
          const prevWord = words[i - 1];
          // คำนวณจุดกึ่งกลางเป็น float ไม่ต้อง round
          const midPointTime = ((prevWord.end ?? 0) + (word.start ?? 0)) / 2;
          timings.push(midPointTime);
        } else {
          // เพิ่มจุดเริ่มต้นของเพลงเป็นจุดแรกสุด
          timings.push(word.start ?? 0);
        }
        line = word.lineIndex;
      }

      // ✨ Step 2: สร้าง Timings ของตัวอักษร (ทำงานเหมือน Tick Mode) ✨
      let segmentDuration: number;
      const nextWord = words[i + 1];

      // ปรับระยะเวลาของคำสุดท้ายในบรรทัด
      if (nextWord && nextWord.lineIndex > word.lineIndex) {
        segmentDuration = ((nextWord.start ?? 0) - (word.start ?? 0)) / 2;
      } else {
        segmentDuration = (word.end ?? 0) - (word.start ?? 0);
      }

      // ปรับความเร็ว
      let speedMultiplier =
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
        const progress = j / (charsInWord - 1 || 1);
        const easedProgress = easeInOut(progress);

        // คำนวณตำแหน่งเป็น float ไม่ต้อง round
        let position = (word.start ?? 0) + easedProgress * effectiveDuration;

        if (position <= lastTime) {
          position = lastTime + minCharSpacing;
        }

        timings.push(position);
        lastTime = position;
      }
    });

    // ✨ Step 3: ตรวจสอบความถูกต้อง (ทำงานเหมือน Tick Mode) ✨
    for (let i = 1; i < timings.length; i++) {
      if (timings[i] <= timings[i - 1]) {
        timings[i] = timings[i - 1] + minCharSpacing;
      }
    }

    console.log("timings", timings);
    return timings;
  }
}
