import React, { useMemo, useRef, useCallback } from "react";
import { useKaraokeStore } from "../../../stores/karaoke-store";
import { ChordEvent } from "../../../modules/midi-klyr-parser/lib/processor";
import { LyricWordData, MusicMode } from "@/types/common.type";
import AutoMoveToLine from "./line/render/auto-move";
import LineRow from "./line";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";

export interface LyricsGridProps {}

const LyricsGrid: React.FC<LyricsGridProps> = ({}) => {
  const onWordClick = usePlayerHandlersStore((state) => state.handleWordClick);
  const mode = useKaraokeStore((state) => state.mode);
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const chordsData = useKaraokeStore((state) => state.chordsData);

  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const groupedLines = useMemo(() => {
    if (!lyricsData?.length) return [];

    const grouped: LyricWordData[][] = [];
    lyricsData.forEach((word) => {
      if (!grouped[word.lineIndex]) grouped[word.lineIndex] = [];
      grouped[word.lineIndex].push(word);
    });

    return grouped.map((line, lineIndex) => {
      line.sort((a, b) => a.index - b.index);

      const rulerStartTime = line[0]?.start ?? null;
      const nextLineStartTime = grouped[lineIndex + 1]?.[0]?.start ?? Infinity;
      const lineChords =
        rulerStartTime !== null
          ? chordsData.filter(
              (chord: ChordEvent) =>
                chord.tick >= rulerStartTime && chord.tick < nextLineStartTime
            )
          : [];

      return { line, lineIndex, lineChords };
    });
  }, [lyricsData, chordsData]);

  const setLineRef = useCallback((el: HTMLDivElement | null, index: number) => {
    lineRefs.current[index] = el;
  }, []);

  return (
    <>
      <AutoMoveToLine lineRefs={lineRefs} />
      <div className="h-full bg-white border border-slate-300 overflow-auto">
        <div className="flex flex-col divide-y">
          {groupedLines.map(({ line, lineIndex, lineChords }) => (
            <LineRow
              lineRef={(el) => setLineRef(el, lineIndex)}
              key={lineIndex}
              line={line}
              lineIndex={lineIndex}
              chords={lineChords}
              onWordClick={onWordClick}
              onWordDelete={() => {}}
              mode={mode}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default LyricsGrid;
