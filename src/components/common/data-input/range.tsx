import React, { CSSProperties } from "react";

interface RangeProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  direction?: "horizontal" | "vertical";
}

const Range: React.FC<RangeProps> = ({
  className = "",
  direction = "horizontal",
  ...props
}) => {
  const orientationStyles =
    direction === "vertical"
      ? "w-2 h-full flex-grow appearance-none bg-gray-300 rounded-lg outline-none cursor-pointer"
      : "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700";

  const writingModeStyle: CSSProperties =
    direction === "vertical"
      ? {
          writingMode: "vertical-lr" as React.CSSProperties["writingMode"],
          direction: "rtl",
        }
      : {};

  return (
    <input
      type="range"
      className={`${orientationStyles} ${className}`}
      style={writingModeStyle}
      {...props}
    />
  );
};

export default Range;
