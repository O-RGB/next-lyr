import ButtonCommon from "@/components/button/button";
import React from "react";
import { FaPlus } from "react-icons/fa";

interface InsertLineProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

const InsertLine: React.FC<InsertLineProps> = ({
  onClick,
  disabled,
  className,
}) => {
  return (
    <>
      <div className={`flex gap-1 w-full items-center ${className}`}>
        <ButtonCommon
          disabled={disabled}
          variant="ghost"
          onClick={onClick}
          className="!px-3 !h-6 !p-0 !shadow-none"
        >
          <div className="flex justify-center items-center gap-1">
            <FaPlus className="text-xs"></FaPlus>
            <span className="text-xs">แทรก</span>
          </div>
        </ButtonCommon>
        <div className="w-full">
          <hr></hr>
        </div>
      </div>
    </>
  );
};

export default InsertLine;
