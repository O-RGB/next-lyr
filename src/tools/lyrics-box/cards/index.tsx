import React, { useEffect, useState } from "react";
import CharactersList from "../characters";
import InsertLine from "./insert-line";
import useLyricsStore from "@/stores/lyrics-store";

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
  disable = false,
}) => {
  return (
    <div className="flex flex-col gap-1 group">
      <InsertLine
        onClick={() => onAddLyrics(index)}
        disabled={disable}
      ></InsertLine>
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
  );
};

export default LyricsBoxRender;
