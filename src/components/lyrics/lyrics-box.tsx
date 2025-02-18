import React from "react";
import { FaEdit } from "react-icons/fa";

interface LyricsBoxProps {
  str: string;
  onActive?: boolean;
}

const LyricsBox: React.FC<LyricsBoxProps> = ({ str, onActive }) => {
  return (
    <>
      <div
        className={`${
          onActive
            ? "bg-red-500 group-hover:bg-red-600"
            : "bg-slate-200"
        } p-2`}
      >
        <div
          className={`${
            onActive ? "text-white" : ""
          } relative`}
        >
          {str}
          {/* <div className="absolute top-0.5 right-0 opacity-0 group-hover:opacity-100 duration-300 ">
            <div className="w-5 h-5 rounded-full bg-blue-500 flex">
              <FaEdit className="text-[10px] m-auto text-white"></FaEdit>
            </div>
          </div> */}
        </div>
      </div>
    </>
  );
};

export default LyricsBox;
