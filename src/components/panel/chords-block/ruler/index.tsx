import React from "react";

// ปรับปรุงฟังก์ชัน format ตัวเลขให้ยืดหยุ่นมากขึ้น
const formatTickLabel = (value: number, zoom: number): string => {
  if (zoom < 0.5) {
    if (value >= 1000) {
      return `${Math.round(value / 1000)}k`;
    }
  }
  if (zoom < 1) {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`.replace(".0", "");
    }
  }
  return value.toString();
};

interface RulerProps {
  totalDuration: number;
  mode: string;
  ppq: number;
  pixelsPerUnit: number;
  zoom: number;
  isMobile: boolean;
}

export const Ruler: React.FC<RulerProps> = React.memo(
  ({ totalDuration, mode, ppq, pixelsPerUnit, zoom, isMobile }) => {
    if (totalDuration === 0) return null;

    // Logic การกำหนดระยะห่างของเส้นตามระดับการซูม
    const getIntervals = () => {
      if (mode === "midi") {
        if (zoom > 2) return { major: ppq / 2, minor: ppq / 4 };
        if (zoom > 0.5) return { major: ppq, minor: ppq / 2 };
        if (zoom > 0.2) return { major: ppq * 2, minor: ppq };
        return { major: ppq * 4, minor: ppq * 2 };
      } else {
        // สำหรับ Time mode - เพิ่ม logic สำหรับเพลงยาว ๆ
        if (zoom > 5) return { major: 1, minor: 0.5 };
        if (zoom > 2.5) return { major: 2, minor: 1 };
        if (zoom > 0.75) return { major: 5, minor: 1 };
        if (zoom > 0.6) return { major: 10, minor: 5 };
        if (zoom > 0.3) return { major: 20, minor: 10 };

        // เพิ่มระดับสำหรับเพลงยาว
        if (zoom > 0.2) return { major: 30, minor: 10 };
        if (zoom > 0.1) return { major: 60, minor: 30 }; // 1 นาที
        if (zoom > 0.05) return { major: 120, minor: 60 }; // 2 นาที
        if (zoom > 0.025) return { major: 300, minor: 120 }; // 5 นาที
        if (zoom > 0.015) return { major: 600, minor: 300 }; // 10 นาที
        if (zoom > 0.008) return { major: 900, minor: 300 }; // 15 นาที
        if (zoom > 0.004) return { major: 1800, minor: 600 }; // 30 นาที

        // สำหรับเพลงยาวมากที่สุด
        return { major: 3600, minor: 1800 }; // 1 ชั่วโมง
      }
    };

    const intervals = getIntervals();
    const ticks = [];

    for (let i = 0; i <= totalDuration; i += intervals.minor) {
      // ใช้ค่าเผื่อเล็กน้อยในการเช็คตัวเลขทศนิยม
      const isMajor = i % intervals.major < 1e-9;
      const position = i * pixelsPerUnit;

      ticks.push(
        <div
          key={i}
          className={isMobile ? "absolute top-0" : "absolute left-0"}
          style={
            isMobile ? { left: `${position}px` } : { top: `${position}px` }
          }
        >
          <div
            className={
              isMobile
                ? isMajor
                  ? "h-4 w-px bg-gray-400"
                  : "h-2 w-px bg-gray-200"
                : isMajor
                ? "w-4 h-px bg-gray-400"
                : "w-2 h-px bg-gray-200"
            }
          />
          {isMajor && (
            <span
              className={
                isMobile
                  ? "absolute top-5 text-[7px] text-gray-400 -translate-x-1/2"
                  : "absolute left-5 text-[7px] text-gray-400 -translate-y-1/2"
              }
            >
              {formatTickLabel(i, zoom)}
              {mode !== "midi" && "s"}
            </span>
          )}
        </div>
      );
    }

    return <>{ticks}</>;
  }
);

Ruler.displayName = "Ruler";
