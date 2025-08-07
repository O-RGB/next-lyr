// src/components/lyrics/lyrics-grid/line/render/auto-move.tsx
import { useKaraokeStore } from "@/stores/karaoke-store";
import React, { useEffect } from "react";

interface AutoMoveToLineProps {
  lineRefs: React.RefObject<(HTMLDivElement | null)[]>;
}

const AutoMoveToLine: React.FC<AutoMoveToLineProps> = ({ lineRefs }) => {
  // ดึง state ที่จำเป็นทั้งหมดมาใช้
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex);
  const isTimingActive = useKaraokeStore((state) => state.isTimingActive);
  const currentIndex = useKaraokeStore((state) => state.currentIndex);
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const editingLineIndex = useKaraokeStore((state) => state.editingLineIndex);

  useEffect(() => {
    let lineToScroll: number | null = null;

    // ตรวจสอบว่ากำลังอยู่ในโหมดปาดเนื้อร้องหรือไม่
    const isStamping = isTimingActive || editingLineIndex !== null;

    if (isStamping) {
      // ถ้าใช่, ให้ยึดบรรทัดของคำปัจจุบัน (currentIndex) เป็นหลัก
      const currentWord = lyricsData[currentIndex];
      if (currentWord) {
        lineToScroll = currentWord.lineIndex;
      }
    } else {
      // ถ้าไม่ใช่ (เป็นโหมดเล่นปกติหรือเลือกด้วยมือ), ให้ยึดบรรทัดที่ถูกเลือก
      lineToScroll = selectedLineIndex;
    }

    // ทำการเลื่อนหน้าจอไปยังบรรทัดเป้าหมาย
    if (lineToScroll !== null && lineRefs.current[lineToScroll]) {
      // ใช้ 'block: center' เพื่อให้บรรทัดอยู่ตรงกลางเสมอ
      lineRefs.current[lineToScroll]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [
    selectedLineIndex,
    isTimingActive,
    editingLineIndex,
    currentIndex,
    lyricsData,
    lineRefs,
  ]);

  return null;
};

export default AutoMoveToLine;
