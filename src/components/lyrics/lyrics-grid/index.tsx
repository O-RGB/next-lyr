import { useKaraokeStore } from "../../../stores/karaoke-store";
import { LyricWordData } from "@/types/common.type";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import React, { useRef, useCallback } from "react";
import AutoMoveToLine from "./line/render/auto-move";
import LineRow from "./line";

export interface LyricsGridProps {}

const LyricsGrid: React.FC<LyricsGridProps> = ({}) => {
  const onWordClick = usePlayerHandlersStore((state) => state.handleWordClick);
  const mode = useKaraokeStore((state) => state.mode);
  const groupedLines = useKaraokeStore((state) => state.lyricsData);

  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  const setLineRef = useCallback((el: HTMLDivElement | null, index: number) => {
    lineRefs.current[index] = el;
  }, []);

  return (
    <>
      <AutoMoveToLine lineRefs={lineRefs} />
      <div className="h-full bg-white border border-slate-300 overflow-auto [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col divide-y">
          {groupedLines.map((line, lineIndex) => (
            <LineRow
              lineRef={(el) => setLineRef(el, lineIndex)}
              key={lineIndex}
              line={line}
              lineIndex={lineIndex}
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
