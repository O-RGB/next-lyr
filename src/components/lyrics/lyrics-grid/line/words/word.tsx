import React, { useRef, useEffect } from "react";
import { LyricWordData } from "@/types/common.type";
import { useKaraokeStore } from "@/stores/karaoke-store";

type WordProps = {
  wordData: LyricWordData;
  onClick: (index: number) => void;
};

type HighlightProps = {
  wordIndex: number;
  lineIndex: number;
};

const PlaybackHighlight: React.FC<Pick<HighlightProps, "wordIndex">> = ({
  wordIndex,
}) => {
  const isPlayback = useKaraokeStore((state) => {
    if (state.playbackIndex !== wordIndex) return false;
    if (state.isTimingActive || state.correctionIndex !== null) {
      if (
        state.currentIndex === wordIndex ||
        state.correctionIndex === wordIndex
      ) {
        return false;
      }
    }
    return true;
  });

  if (!isPlayback) return null;

  return (
    <div className="absolute inset-0 bg-yellow-200 pointer-events-none z-10" />
  );
};

const ActiveTimingHighlight: React.FC<Pick<HighlightProps, "wordIndex">> = ({
  wordIndex,
}) => {
  const isActive = useKaraokeStore(
    (state) =>
      state.currentIndex === wordIndex &&
      state.correctionIndex !== wordIndex &&
      (state.isTimingActive || state.correctionIndex !== null)
  );
  if (!isActive) return null;

  return (
    <div className="absolute inset-0 outline outline-2 outline-blue-500 bg-blue-100/60 pointer-events-none z-20" />
  );
};

const PendingCorrectionHighlight: React.FC<
  Pick<HighlightProps, "wordIndex">
> = ({ wordIndex }) => {
  const isPendingCorrection = useKaraokeStore(
    (state) => state.correctionIndex === wordIndex
  );
  if (!isPendingCorrection) return null;

  return (
    <div className="absolute inset-0 outline outline-2 outline-orange-500 bg-orange-100/70 pointer-events-none z-20" />
  );
};

const EditingHighlight: React.FC<Pick<HighlightProps, "lineIndex">> = ({
  lineIndex,
}) => {
  const isEditing = useKaraokeStore((state) => {
    const isFocusedForTiming =
      state.editingLineIndex !== null && lineIndex >= state.editingLineIndex;
    const isFocusedBySelection =
      !state.isTimingActive && state.selectedLineIndex === lineIndex;
    return isFocusedForTiming || isFocusedBySelection;
  });

  if (!isEditing) return null;
  return (
    <div className="absolute inset-0 bg-purple-50/80 pointer-events-none" />
  );
};

const Word = React.memo(({ wordData, onClick }: WordProps) => {
  const wordRef = useRef<HTMLDivElement | null>(null);

  const isTimed = useKaraokeStore((state) => {
    const line = state.lyricsData[wordData.lineIndex];
    const word = line?.find((w) => w.index === wordData.index);
    if (word?.start !== null) {
      return true;
    }

    if (state.isTimingActive && state.timingBuffer) {
      const hasBufferEntry = state.timingBuffer.buffer.has(wordData.index);
      if (hasBufferEntry && wordData.index < state.currentIndex) {
        return true;
      }
    }

    return false;
  });

  const isActiveForScroll = useKaraokeStore((state) => {
    let activeIndex: number;
    if (state.isTimingActive || state.editingLineIndex !== null) {
      activeIndex = state.currentIndex;
    } else {
      activeIndex = state.playbackIndex ?? -1;
    }
    return activeIndex === wordData.index;
  });

  useEffect(() => {
    if (isActiveForScroll && wordRef.current) {
      wordRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [isActiveForScroll]);

  const baseClasses = `
    group relative cursor-pointer
    border px-2 lg:px-2.5 py-1 lg:py-1.5
    text-sm select-none text-nowrap
    font-medium shadow-sm bg-white
    border-slate-300 hover:bg-slate-100
  `;
  const timedClass = isTimed ? "border-l-4 border-l-green-500" : "";

  return (
    <div
      ref={wordRef}
      className={`${baseClasses} ${timedClass}`}
      data-index={wordData.index}
      onClick={() => onClick(wordData.index)}
    >
      <span className="relative z-30">{wordData.name}</span>
      <EditingHighlight lineIndex={wordData.lineIndex} />
      <PlaybackHighlight wordIndex={wordData.index} />
      <PendingCorrectionHighlight wordIndex={wordData.index} />
      <ActiveTimingHighlight wordIndex={wordData.index} />
    </div>
  );
});

Word.displayName = "Word";

export default Word;
