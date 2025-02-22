import ButtonCommon from "@/components/button/button";
import React from "react";
import { MdEdit, MdDeleteForever } from "react-icons/md";
import CharacterBox from "../characters/character";

interface LyricsCardProps {
  lyr: string[];
  index: number;
  idForScroll?: string;
  lineCurrent?: number;
  wordCurrent?: number;
}

const LyricsCard: React.FC<LyricsCardProps> = ({
  lyr,
  index,
  idForScroll = "",
  lineCurrent,
  wordCurrent,
}) => {
  return (
    <>
      {/* <ModalCommon
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
      </ModalCommon> */}
      <div className="flex flex-col gap-1 group">
        <div
          id={idForScroll}
          className={`p-2 rounded-md bg-white flex gap-2 w-full h-full ${
            lineCurrent === index ? "outline outline-red-500" : ""
          }`}
        >
          <div className="flex h-full w-10 bg-slate-600 rounded-md">
            <div className="text-sm m-auto text-white">{index + 1}</div>
          </div>

          <div className="flex gap-1 flex-wrap w-full">
            {lyr.map((lyr, i) => {
              return (
                <div
                  className="relative rounded-md  hover:scale-105 duration-500 overflow-hidden cursor-default group"
                  key={`res-box-${i}`}
                >
                  <div className="border w-full bg-slate-200 text-center text-[10px] opacity-35">
                    {i + 1}
                  </div>
                  <CharacterBox
                    onActive={wordCurrent === i}
                    chr={lyr}
                  ></CharacterBox>
                </div>
              );
            })}

            <div className="flex gap-1 p-2 opacity-100 lg:opacity-0 group-hover:opacity-100 duration-500"></div>
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <ButtonCommon
                className="!w-6 !h-6 !p-0"
                color="primary"
                // onClick={() => setOpenEdit(true)}
                icon={<MdEdit className="text-xs"></MdEdit>}
              ></ButtonCommon>
            </div>
            <div>
              <ButtonCommon
                className="!w-6 !h-6 !p-0"
                color="danger"
                // onClick={() => setOpenEdit(true)}
                icon={<MdDeleteForever className="text-xs"></MdDeleteForever>}
              ></ButtonCommon>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LyricsCard;
