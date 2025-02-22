import ButtonCommon from "@/components/button/button";
import React from "react";
import { FaPlus } from "react-icons/fa";
import CharactersList from "../characters";

interface LyricsBoxRenderProps {
  onAddLyrics: (index: number) => void;
  onEditLyrics: (index: number, list: string[]) => void;
  onDeleteLyricsIndex: (index: number) => void;
  lineCurrent?: number;
  wordCurrent?: number;
  index: number;
  lyr: string[];
  disable?: boolean;
}

const LyricsBoxRender: React.FC<LyricsBoxRenderProps> = ({
  onAddLyrics,
  onEditLyrics,
  onDeleteLyricsIndex,
  lineCurrent,
  wordCurrent,
  index,
  lyr = [],
  disable,
}) => {
  return (
    <>
      <div className="flex flex-col gap-1 group">
        <div className="flex gap-1 w-full items-center">
          <ButtonCommon
            disabled={disable}
            variant="ghost"
            onClick={() => onAddLyrics(index)}
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
        <div
          id={`line-${index}`}
          className={`p-2 rounded-md bg-white flex gap-2 w-full h-full ${
            lineCurrent === index ? "outline outline-red-500" : ""
          }`}
        >
          <div className="flex h-full w-10 bg-slate-600 rounded-md">
            <div className="text-sm m-auto text-white">{index + 1}</div>
          </div>
          <CharactersList
            disable={disable}
            lineIndex={index ?? 0}
            isLineActive={lineCurrent === index}
            wordIndex={wordCurrent ?? 0}
            list={lyr}
            onEditLyrics={(lyrics) => onEditLyrics(index, lyrics)}
            onDeleteLyrics={onDeleteLyricsIndex}
          />
        </div>
      </div>
    </>
  );
};

export default LyricsBoxRender;
