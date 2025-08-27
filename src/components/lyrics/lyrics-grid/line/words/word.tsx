// src/components/lyrics/lyrics-grid/line/words/word.tsx

import React, { forwardRef, useEffect, useMemo } from "react";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { LyricWordData } from "@/types/common.type";

const usePlaybackState = (wordIndex: number) => {
  return useKaraokeStore((state) => state.playbackIndex === wordIndex);
};

const useActiveState = (wordData: LyricWordData, isCurrentLine: boolean) => {
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
  const editingLineIndex = useKaraokeStore((state) => state.editingLineIndex);
  const isTimingActive = useKaraokeStore((state) => state.isTimingActive);
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex); // Get selectedLineIndex

  return useMemo(() => {
    // This is for single-line editing mode
    if (editingLineIndex === wordData.lineIndex && !isTimingActive) {
      return true;
    }

    // This is for the multi-line re-timing mode.
    // A word is in the "editing" state for re-timing if:
    // 1. We are NOT in single-line edit mode (editingLineIndex is null)
    // 2. We are NOT actively stamping timings yet (isTimingActive is false)
    // 3. The word has no start time (it has been cleared for re-timing)
    // 4. Its line index is the selected line or any line after it.
    if (
      editingLineIndex === null &&
      !isTimingActive &&
      wordData.start === null &&
      selectedLineIndex !== null &&
      wordData.lineIndex >= selectedLineIndex
    ) {
      return true;
    }

    return false;
  }, [editingLineIndex, wordData, isTimingActive, selectedLineIndex]);
};

const usePendingCorrectionState = (
  wordIndex: number,
  isCurrentLine: boolean
) => {
  const correctionIndex = useKaraokeStore((state) =>
    isCurrentLine ? state.correctionIndex : null
  );

  return useMemo(() => {
    if (!isCurrentLine) return false;
    return correctionIndex === wordIndex;
  }, [isCurrentLine, correctionIndex, wordIndex]);
};

const useTimedState = (wordData: LyricWordData, isCurrentLine: boolean) => {
  const lineBuffer = useKaraokeStore((state) =>
    isCurrentLine ? state.timingBuffer?.buffer : undefined
  );

  return useMemo(() => {
    if (!isCurrentLine) {
      return wordData.start !== null;
    }

    const hasOriginalTime = wordData.start !== null;
    const isInBufferAndTimed =
      !!lineBuffer &&
      lineBuffer.has(wordData.index) &&
      lineBuffer.get(wordData.index)?.end !== null;

    return hasOriginalTime || isInBufferAndTimed;
  }, [wordData.start, wordData.index, lineBuffer, isCurrentLine]);
};

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
      text-sm select-none text-nowrap
      font-medium shadow-sm`;

      let classes = [baseClasses];
      let backgroundClass = "bg-white border-slate-300 hover:bg-slate-200";
      let additionalClasses = "";

      if (isTimed) {
        additionalClasses += " border-l-4 border-l-green-500";
        backgroundClass = "bg-white";
      }

      if (isEditing) {
        backgroundClass =
          "border-purple-400 bg-purple-50/80 hover:bg-purple-100";
      }

      if (isPendingCorrection) {
        backgroundClass =
          "outline outline-orange-500 font-bold bg-orange-100 border-orange-400";
      }

      if (isPlayback) {
        backgroundClass = "!border-amber-400 !bg-amber-200/80";
      }

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
      const isPlayback = usePlaybackState(wordData.index);
      const isActive = useActiveState(wordData, isCurrentLine);
      const isEditing = useEditingState(wordData, isCurrentLine);
      const isPendingCorrection = usePendingCorrectionState(
        wordData.index,
        isCurrentLine
      );
      const isTimed = useTimedState(wordData, isCurrentLine);

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
