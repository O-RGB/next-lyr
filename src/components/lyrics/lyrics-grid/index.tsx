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
  const setRowVirtualizer = usePlayerSetupStore(
    (state) => state.setRowVirtualizer
  );

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: groupedLines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // ประมาณความสูงของแต่ละแถว (ปรับค่าได้)
    overscan: 5, // จำนวน item ที่จะ render เผื่อไว้ (บน-ล่าง)
  });

  useEffect(() => {
    if (rowVirtualizer) {
      setRowVirtualizer(rowVirtualizer);
    }
    // Cleanup function เพื่อเคลียร์ค่าเมื่อ component unmount
    return () => {
      setRowVirtualizer(null);
    };
  }, [rowVirtualizer, setRowVirtualizer]);

  return (
    <div
      ref={parentRef}
      className="h-full bg-white border border-slate-300 overflow-auto [&::-webkit-scrollbar]:hidden"
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

          // ตรวจสอบให้แน่ใจว่า line มีค่าก่อนที่จะ render
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
