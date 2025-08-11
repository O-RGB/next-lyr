import React from "react";
import Range from "@/components/common/data-input/range";

interface ZoomControlProps {
  isMobile: boolean;
  zoom: number;
  setZoom: (zoom: number) => void;
}

const ZoomControl: React.FC<ZoomControlProps> = ({
  isMobile,
  zoom,
  setZoom,
}) => {
  if (isMobile) {
    return (
      <div className="flex flex-col items-center justify-center p-2 bg-gray-100 rounded-md w-[40px] flex-shrink-0">
        <Range
          direction="vertical"
          min="0.25"
          max="4"
          step="0.05"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        />
        <span className="text-xs mt-2 font-bold">{zoom.toFixed(1)}x</span>
      </div>
    );
  }

  return (
    <div className="flex items-center p-2 bg-gray-100 rounded-md">
      <span className="text-xs font-bold mr-2">Zoom:</span>
      <Range
        min="0.25"
        max="4"
        step="0.05"
        value={zoom}
        onChange={(e) => setZoom(Number(e.target.value))}
      />
      <span className="text-xs w-12 text-center">{zoom.toFixed(2)}x</span>
    </div>
  );
};

export default ZoomControl;
