import React, { forwardRef, useEffect, useMemo } from "react";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { LyricWordData } from "@/types/common.type";
import { TiimingBuffer } from "@/stores/karaoke-store/types";

// Custom hooks for state management with selective subscriptions
const usePlaybackState = (wordIndex: number) => {
  // Playback สามารถแสดงได้ทุกที่ ไม่จำกัดด้วย isCurrentLine
  return useKaraokeStore((state) => state.playbackIndex === wordIndex);
};

const useActiveState = (wordData: LyricWordData, isCurrentLine: boolean) => {
  // Subscribe เฉพาะเมื่อ isCurrentLine เป็น true
  const currentIndex = useKaraokeStore((state) =>
    isCurrentLine ? state.currentIndex : null
  );
  const isTimingActive = useKaraokeStore((state) =>
    isCurrentLine ? state.isTimingActive : false
  );
  const correctionIndex = useKaraokeStore((state) =>
    isCurrentLine ? state.correctionIndex : null
  );

  return useMemo(() => {
    if (!isCurrentLine) return false;

    return (
      currentIndex === wordData.index &&
      (isTimingActive || correctionIndex !== null)
    );
  }, [
    isCurrentLine,
    currentIndex,
    wordData.index,
    isTimingActive,
    correctionIndex,
  ]);
};

const useEditingState = (wordData: LyricWordData, isCurrentLine: boolean) => {
  // Subscribe เฉพาะเมื่อ isCurrentLine เป็น true
  const editingLineIndex = useKaraokeStore((state) => state.editingLineIndex);
  const isTimingActive = useKaraokeStore((state) =>
    isCurrentLine ? state.isTimingActive : false
  );

  return useMemo(() => {
    if (!isCurrentLine) return false;

    return editingLineIndex === wordData.lineIndex && !isTimingActive;
  }, [isCurrentLine, editingLineIndex, wordData.lineIndex, isTimingActive]);
};

const usePendingCorrectionState = (
  wordIndex: number,
  isCurrentLine: boolean
) => {
  // Subscribe เฉพาะเมื่อ isCurrentLine เป็น true
  const correctionIndex = useKaraokeStore((state) =>
    isCurrentLine ? state.correctionIndex : null
  );

  return useMemo(() => {
    if (!isCurrentLine) return false;
    return correctionIndex === wordIndex;
  }, [isCurrentLine, correctionIndex, wordIndex]);
};

const useTimedState = (wordData: LyricWordData, isCurrentLine: boolean) => {
  // Subscribe buffer เฉพาะเมื่อ isCurrentLine เป็น true
  const lineBuffer = useKaraokeStore((state) =>
    isCurrentLine ? state.timingBuffer?.buffer : undefined
  );

  return useMemo(() => {
    // ถ้าไม่ใช่ current line ให้ดูแค่ start time (ไม่ re-render)
    if (!isCurrentLine) {
      return wordData.start !== null;
    }

    // ถ้าเป็น current line ให้ดูทั้ง start time และ buffer
    return wordData.start !== null || !!lineBuffer;
  }, [wordData.start, lineBuffer, isCurrentLine]);
};

// Main Word Component with dynamic styling
const BaseWord = forwardRef<
  HTMLDivElement,
  {
    wordData: LyricWordData;
    onClick: (index: number) => void;
    isPlayback: boolean;
    isActive: boolean;
    isEditing: boolean;
    isPendingCorrection: boolean;
    isTimed: boolean;
  }
>(
  (
    {
      wordData,
      onClick,
      isPlayback,
      isActive,
      isEditing,
      isPendingCorrection,
      isTimed,
    },
    ref
  ) => {
    const getWordClasses = () => {
      const baseClasses = `lyric-word group relative cursor-pointer 
      rounded-md border px-2 lg:px-2.5 py-1 lg:py-1.5 pr-2 lg:pr-3 
      text-sm select-none text-nowrap transition-all duration-200 ease-in-out
      font-medium shadow-sm`;

      let classes = [baseClasses];
      let backgroundClass = "bg-white border-slate-300 hover:bg-slate-200";
      let additionalClasses = "";

      // Priority order (highest priority last to override)

      // 1. Timed state (เขียว - สีเดิม)
      if (isTimed) {
        additionalClasses += " border-l-4 border-l-green-500";
        backgroundClass = "bg-white hover:bg-green-100";
      }

      // 2. Editing state (ม่วง - สีเดิม)
      if (isEditing) {
        backgroundClass =
          "border-purple-400 bg-purple-50/80 hover:bg-purple-100";
      }

      // 3. Pending correction state (ส้ม - สีเดิม)
      if (isPendingCorrection) {
        backgroundClass =
          "outline outline-orange-500 font-bold bg-orange-100 border-orange-400";
      }

      // 4. Playback state (ทอง - สีเดิม)
      if (isPlayback) {
        backgroundClass = "!border-amber-400 !bg-amber-200/80";
      }

      // 5. Active state (ฟ้า - สีเดิม)
      if (isActive) {
        additionalClasses += " outline outline-blue-500 font-bold";
        if (!isPlayback) {
          backgroundClass = "bg-blue-100 border-blue-400";
        }
      }

      return `${baseClasses} ${backgroundClass} ${additionalClasses}`.trim();
    };

    return (
      <div
        ref={ref}
        className={getWordClasses()}
        data-index={wordData.index}
        onClick={() => onClick(wordData.index)}
      >
        {wordData.name}
      </div>
    );
  }
);

type WordProps = {
  wordData: LyricWordData;
  lineIndex: number;
  onClick: (index: number) => void;
  onSelect?: (index: number) => void;
  onActiveLine?: (bool: boolean, lineIndex: number) => void;
  isCurrentLine: boolean;
};

const Word = React.memo(
  forwardRef<HTMLDivElement, WordProps>(
    (
      { wordData, lineIndex, onClick, onSelect, onActiveLine, isCurrentLine },
      ref
    ) => {
      // State hooks - มีการป้องกัน rerender
      const isPlayback = usePlaybackState(wordData.index); // แสดงได้ทุกเวลา
      const isActive = useActiveState(wordData, isCurrentLine); // เฉพาะ current line
      const isEditing = useEditingState(wordData, isCurrentLine); // เฉพาะ current line
      const isPendingCorrection = usePendingCorrectionState(
        wordData.index,
        isCurrentLine
      ); // เฉพาะ current line
      const isTimed = useTimedState(wordData, isCurrentLine); // ขึ้นกับ isCurrentLine

      const shouldSelect = isPlayback || isActive || isEditing;

      useEffect(() => {
        if (shouldSelect && onSelect) {
          onSelect(wordData.index);
        }
      }, [shouldSelect, onSelect, wordData.index]);

      useEffect(() => {
        onActiveLine?.(isCurrentLine, lineIndex);
      }, [isCurrentLine, onActiveLine, lineIndex]);

      return (
        <>
          <BaseWord
            ref={ref}
            wordData={wordData}
            onClick={onClick}
            isPlayback={isPlayback}
            isActive={isActive}
            isEditing={isEditing}
            isPendingCorrection={isPendingCorrection}
            isTimed={isTimed}
          />
        </>
      );
    }
  ),
  (prevProps, nextProps) => {
    // Custom comparison function สำหรับ React.memo
    // Re-render เฉพาะเมื่อ:
    // 1. wordData เปลี่ยน
    // 2. isCurrentLine เปลี่ยน
    // 3. playback index เปลี่ยน (เพื่อให้ playback แสดงได้ทุกที่)

    const playbackIndex = useKaraokeStore.getState().playbackIndex;
    const prevPlaybackIndex = prevProps.wordData.index === playbackIndex;
    const nextPlaybackIndex = nextProps.wordData.index === playbackIndex;

    return (
      prevProps.wordData === nextProps.wordData &&
      prevProps.isCurrentLine === nextProps.isCurrentLine &&
      prevProps.onClick === nextProps.onClick &&
      prevProps.onSelect === nextProps.onSelect &&
      prevProps.onActiveLine === nextProps.onActiveLine &&
      prevPlaybackIndex === nextPlaybackIndex
    );
  }
);

Word.displayName = "Word";

export default Word;
