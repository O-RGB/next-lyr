import React, { useEffect, useState } from "react";
import CharacterBox from "./character";
import LyricsEditSection from "@/tools/lyrics-edit-section";
import ModalCommon from "@/components/modal/modal";
import ButtonCommon from "@/components/button/button";
import { MdEdit, MdDeleteForever } from "react-icons/md";
interface CharactersListProps {
  list: string[];
  isLineActive?: boolean;
  lineIndex: number;
  wordIndex: number;
  onEditLyrics?: (lyrics: string[]) => void;
  onDeleteLyrics?: (line: number) => void;
  disable?: boolean;
}

const CharactersList: React.FC<CharactersListProps> = ({
  list,
  isLineActive,
  lineIndex,
  wordIndex,
  onEditLyrics,
  onDeleteLyrics,
  disable,
}) => {
  const [lyric, setLyric] = useState<string[]>([]);
  const [openEdit, setOpenEdit] = useState<boolean>(false);
  const [removeOpen, setRemoveOpen] = useState<boolean>(false);

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
            onEditLyrics?.(lyr);
            setLyric(lyr);
            setOpenEdit(false);
          }}
        ></LyricsEditSection>
      </ModalCommon>
      <ModalCommon
        title="ลบท่อนเพลง"
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
      >
        <div className="flex flex-col gap-2">
          ยืนยันการลบท่อนเพลงที่ {lineIndex + 1}?
          <BoxRender
            lyric={lyric}
            wordIndex={wordIndex}
            lineCurrent={lineIndex}
          ></BoxRender>
          <div className="flex items-center justify-end gap-2">
            <ButtonCommon color="gray">ยกเลิก</ButtonCommon>
            <ButtonCommon
              onClick={() => {
                onDeleteLyrics?.(lineIndex);
                setRemoveOpen(false);
              }}
              color="danger"
            >
              ลบออก
            </ButtonCommon>
          </div>
        </div>
      </ModalCommon>
      <BoxRender
        lyric={lyric}
        isLineActive={isLineActive}
        wordIndex={wordIndex}
        lineCurrent={lineIndex}
      ></BoxRender>

      <div className="flex flex-col gap-2">
        <div>
          <ButtonCommon
            disabled={disable}
            className="!w-6 !h-6 !p-0"
            color="primary"
            onClick={() => setOpenEdit(true)}
            icon={<MdEdit className="text-xs"></MdEdit>}
          ></ButtonCommon>
        </div>

        <ButtonCommon
          disabled={disable}
          className="!w-6 !h-6 !p-0"
          color="danger"
          onClick={() => setRemoveOpen(true)}
          icon={<MdDeleteForever className="text-xs"></MdDeleteForever>}
        ></ButtonCommon>
      </div>
    </>
  );
};

export default CharactersList;

function BoxRender({
  isLineActive,
  lyric,
  wordIndex,
  lineCurrent,
}: {
  lyric: string[];
  isLineActive?: boolean;
  wordIndex: number;
  lineCurrent: number;
}) {
  return (
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
            <CharacterBox
              thisLineIndex={lineCurrent}
              thisWordIndex={i}
              onActive={isLineActive && wordIndex === i}
              chr={lyr}
            ></CharacterBox>
          </div>
        );
      })}
    </div>
  );
}
