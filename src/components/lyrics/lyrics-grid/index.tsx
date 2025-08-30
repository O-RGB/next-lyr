import { useKaraokeStore } from "../../../stores/karaoke-store";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import React, { useRef, useEffect } from "react";
import LineRow from "./line";
import { useVirtualizer } from "@tanstack/react-virtual";
import { usePlayerSetupStore } from "@/hooks/usePlayerSetup";

export interface LyricsGridProps {}

const LyricsGrid: React.FC<LyricsGridProps> = ({}) => {
  const onWordClick = usePlayerHandlersStore((state) => state.handleWordClick);
  const groupedLines = useKaraokeStore((state) => state.lyricsData);
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex);
  const setRowVirtualizer = usePlayerSetupStore(
    (state) => state.setRowVirtualizer
  );

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: groupedLines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  });

  useEffect(() => {
    setRowVirtualizer(rowVirtualizer);
    return () => {
      setRowVirtualizer(null);
    };
  }, [rowVirtualizer, setRowVirtualizer]);

  // ✨ ย้าย Logic การเลื่อนมาไว้ที่นี่
  useEffect(() => {
    if (selectedLineIndex !== null && rowVirtualizer) {
      rowVirtualizer.scrollToIndex(selectedLineIndex, {
        align: "center",
        behavior: "smooth",
      });
    }
  }, [selectedLineIndex, rowVirtualizer]);

  return (
    <div
      ref={parentRef}
      className="h-full rounded-md bg-white border border-slate-300 overflow-auto [&::-webkit-scrollbar]:hidden"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const line = groupedLines[virtualItem.index];
          const lineIndex = virtualItem.index;

          if (!line) {
            return null;
          }

          return (
            <div
              key={virtualItem.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <LineRow
                line={line}
                lineIndex={lineIndex}
                onWordClick={onWordClick}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LyricsGrid;
