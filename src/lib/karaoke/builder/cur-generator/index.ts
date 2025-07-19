import { LyricWordData } from "@/pages/update/lib/type";

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

    timings.push(words[0].start ?? 0);

    const easeInOut = (t: number): number =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const minCharSpacing = 3;
    const speedFactor = 1.2;

    words.forEach((word, i) => {
      const segmentDuration = (word.end ?? 0) - (word.start ?? 0);

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

    for (let i = 1; i < timings.length; i++) {
      if (timings[i] <= timings[i - 1]) timings[i] = timings[i - 1] + 1;
    }

    return timings;
  }
}

export class TimestampLyricSegmentGenerator implements LyricSegmentGenerator {
  generateSegment(words: LyricWordData[]): number[] {
    if (words.length === 0) {
      return [];
    }

    const minCharTime = 0.001; // เวลาขั้นต่ำสุดระหว่างตัวอักษร

    // --- Step 1: คำนวณความเร็วพื้นฐานของแต่ละคำ (จำนวนตัวอักษรต่อวินาที) ---
    const speeds = words.map((word) => {
      const duration = (word.end ?? 0) - (word.start ?? 0);
      // ป้องกันการหารด้วยศูนย์ถ้าคำไม่มีระยะเวลาหรือไม่มีตัวอักษร
      if (duration <= 0 || word.name.length === 0) {
        return 0;
      }
      return word.name.length / duration;
    });

    // --- Step 2: สร้าง Timestamps จากความเร็วที่ผสมข้ามขอบเขตแล้ว ---
    const unscaledTimings: number[] = [];
    let currentTime = words[0].start ?? 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const charsInWord = word.name.length;
      if (charsInWord === 0) {
        continue;
      }

      // หาความเร็ว ณ จุดเริ่มต้นและจุดสิ้นสุดของขอบเขตคำปัจจุบัน
      const prevSpeed = speeds[i - 1] ?? speeds[i]; // ถ้าเป็นคำแรก ให้ใช้ความเร็วตัวเอง
      const currentSpeed = speeds[i];
      const nextSpeed = speeds[i + 1] ?? speeds[i]; // ถ้าเป็นคำสุดท้าย ให้ใช้ความเร็วตัวเอง

      // ความเร็ว ณ รอยต่อ คือค่าเฉลี่ยของสองคำที่มาบรรจบกัน
      const startBoundarySpeed = (prevSpeed + currentSpeed) / 2;
      const endBoundarySpeed = (currentSpeed + nextSpeed) / 2;

      for (let j = 0; j < charsInWord; j++) {
        // เกลี่ยความเร็วจากต้นคำไปท้ายคำแบบ Linear
        const progress = charsInWord === 1 ? 1.0 : j / (charsInWord - 1);
        const interpolatedSpeed =
          (1 - progress) * startBoundarySpeed + progress * endBoundarySpeed;

        if (interpolatedSpeed <= 0) {
          // ถ้าความเร็วเป็นศูนย์ (เช่น ช่วงเงียบ) ให้ใช้ค่าเวลาขั้นต่ำ
          currentTime += minCharTime;
        } else {
          // เวลาที่ใช้สำหรับตัวอักษรนี้ = 1 / ความเร็ว
          const deltaTime = 1 / interpolatedSpeed;
          currentTime += deltaTime;
        }
        unscaledTimings.push(currentTime);
      }
    }

    // --- Step 3: ปรับสเกล Timings ทั้งหมดให้กลับมาพอดีกับระยะเวลาจริง ---
    const actualStartTime = words[0].start ?? 0;
    const actualEndTime = words[words.length - 1].end ?? 0;
    const actualDuration = actualEndTime - actualStartTime;

    // หาจุดเริ่มต้นและสิ้นสุดของเวลาที่คำนวณได้
    const calculatedStartTime = unscaledTimings[0] ?? actualStartTime;
    const calculatedEndTime =
      unscaledTimings[unscaledTimings.length - 1] ?? actualEndTime;
    const calculatedDuration = calculatedEndTime - calculatedStartTime;

    // ถ้าไม่สามารถปรับสเกลได้ (เช่น ระยะเวลาเป็น 0) ให้คืนค่าแบบพื้นฐาน
    if (actualDuration <= 0 || calculatedDuration <= 0) {
      const fallbackTimings = words.flatMap((w) =>
        Array(w.name.length).fill(w.start ?? 0)
      );
      fallbackTimings.unshift(words[0].start ?? 0);
      return fallbackTimings;
    }

    const scaleFactor = actualDuration / calculatedDuration;

    let finalTimings = unscaledTimings.map((t) => {
      const timeFromCalcStart = t - calculatedStartTime;
      return actualStartTime + timeFromCalcStart * scaleFactor;
    });

    // เพิ่ม timestamp ตัวแรกสุดกลับเข้าไป (สำคัญมาก)
    finalTimings.unshift(actualStartTime);

    // ตรวจสอบความถูกต้องและความปลอดภัยของค่าครั้งสุดท้าย
    for (let i = 1; i < finalTimings.length; i++) {
      if (finalTimings[i] <= finalTimings[i - 1]) {
        finalTimings[i] = finalTimings[i - 1] + minCharTime;
      }
    }

    return finalTimings;
  }
}
