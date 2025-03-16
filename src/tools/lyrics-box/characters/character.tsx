import useLyricsStore from "@/stores/lyrics-store";
import React, { useEffect, useState } from "react";

interface CharacterBoxProps {
  chr: string;
  onActive?: boolean;
  thisLineIndex?: number;
  thisWordIndex?: number;
}

const CharacterBox: React.FC<CharacterBoxProps> = ({
  chr,
  onActive,
  thisLineIndex,
  thisWordIndex,
}) => {
  // const getCursorByLine = useLyricsStore((state) => state.getCursorByLine);
  // const [trick, setTrick] = useState<number>(0);

  // useEffect(() => {
  //   if (thisLineIndex !== undefined && thisWordIndex !== undefined) {
  //     const tick = getCursorByLine(thisLineIndex, thisWordIndex);
  //     setTrick(tick as number);
  //   }
  // }, [onActive]);

  return (
    <>
    
    {/* <span className="text-[10px] text-center w-full">{thisLineIndex}|{thisWordIndex}</span> */}
      <div
        className={`${
          onActive ? "bg-red-500 group-hover:bg-red-600" : "bg-slate-200"
        } p-2`}
      >
        <div className={`${onActive ? "text-white" : ""} relative`}>{chr}</div>
        {/* <span className="text-[10px] text-center w-full">{trick}</span> */}
      </div>
    </>
  );
};

export default CharacterBox;
