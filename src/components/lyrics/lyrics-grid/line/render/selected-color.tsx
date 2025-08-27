import React from "react";

interface SelectedColorLineProps {
  isSelected: boolean;
}

const SelectedColorLine: React.FC<SelectedColorLineProps> = ({
  isSelected,
}) => {
  if (isSelected) {
    return (
      <div
        className={`bg-fuchsia-100 absolute w-full h-full top-0 left-0 z-1`}
      ></div>
    );
  } else {
    return null;
  }
};

export default SelectedColorLine;
