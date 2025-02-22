import React from "react";
import { FaEdit } from "react-icons/fa";

interface CharacterBoxProps {
  chr: string;
  onActive?: boolean;
}

const CharacterBox: React.FC<CharacterBoxProps> = ({ chr, onActive }) => {
  return (
    <>
      <div
        className={`${
          onActive ? "bg-red-500 group-hover:bg-red-600" : "bg-slate-200"
        } p-2`}
      >
        <div className={`${onActive ? "text-white" : ""} relative`}>{chr}</div>
      </div>
    </>
  );
};

export default CharacterBox;
