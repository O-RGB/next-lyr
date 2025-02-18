import React, { useEffect, useState } from "react";
import LyricsBox from "./lyrics-box";
import ModalCommon from "../modal/modal";
import { FaEdit } from "react-icons/fa";
import LyricsEditSection from "@/tools/lyrics-edit-section";

interface LyricsBoxListProps {
  list: string[];
  isLineActive?: boolean;
  wordIndex: number;
  onSaveList?: (lyrics: string[]) => void;
}

const LyricsBoxList: React.FC<LyricsBoxListProps> = ({
  list,
  isLineActive,
  wordIndex,
  onSaveList,
}) => {
  const [lyric, setLyric] = useState<string[]>([]);
  const [openEdit, setOpenEdit] = useState<boolean>(false);

  useEffect(() => {}, [isLineActive, wordIndex]);

  useEffect(() => {
    if (lyric.length === 0) {
      setLyric(list);
    }
  }, [list]);
  return (
    <>
      <ModalCommon
        title="แก้ไข"
        open={openEdit}
        onClose={() => setOpenEdit(false)}
      >
        <LyricsEditSection
          list={lyric}
          onSave={(lyr) => {
            onSaveList?.(lyr);
            setLyric(lyr);
            setOpenEdit(false);
          }}
        ></LyricsEditSection>
      </ModalCommon>
      <div className="flex gap-1 flex-wrap w-full">
        {lyric.map((lyr, i) => {
          return (
            <div
              className="relative rounded-md  hover:scale-105 duration-500 overflow-hidden cursor-default group"
              key={`res-box-${i}`}
            >
              <div className="border w-full bg-slate-200 text-center text-[10px] opacity-35">
                {i + 1}
              </div>
              <LyricsBox
                onActive={isLineActive && wordIndex === i}
                str={lyr}
              ></LyricsBox>
            </div>
          );
        })}

        <div className="flex p-2">
          <div
            onClick={() => setOpenEdit(true)}
            className="m-auto bg-gray-400 hover:bg-blue-400 w-5 h-5 rounded-md flex duration-300 cursor-pointer"
          >
            <FaEdit className="m-auto text-white text-xs"></FaEdit>
          </div>
        </div>
      </div>
    </>
  );
};

export default LyricsBoxList;
