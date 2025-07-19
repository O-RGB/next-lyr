"use client";

import ButtonCommon from "@/components/button/button";
import ModalCommon from "@/components/modal/modal";
import MusicDetailForm from "@/form/music-detail";
import useLyricsStore from "@/stores/lyrics-store";
import useMidiPlayerStore from "@/stores/midi-plyer-store";
import useSegementerStore from "@/stores/segmenter-store";
import CurExport from "@/tools/export/cur-export";
import LyrExport from "@/tools/export/lyr-export";
import LyricsSection from "@/tools/lyrics-box";
import LyricsPlayer from "@/tools/lyrics-player";
import MidiPlayer from "@/tools/midi-player";
import TouchNextLyr from "@/tools/touch-next-lyr";
import React, { useEffect, useState } from "react";
import { BsFileEarmarkPlayFill } from "react-icons/bs";
import Home from "./update/pages";
import { TimestampLyricSegmentGenerator } from "@/lib/karaoke/builder/cur-generator";

interface HomePageProps {}

const HomePage: React.FC<HomePageProps> = ({}) => {
  // const lyrics = useLyricsStore((state) => state.lyrics);
  // const setLyricsCuted = useLyricsStore((state) => state.setLyricsCuted);
  // const wordsCutText = useSegementerStore((state) => state.wordsCutText);
  // const loadSegementer = useSegementerStore((state) => state.loadSegementer);
  // const loadSynth = useMidiPlayerStore((state) => state.loadSynth);

  // const lineIndex = useLyricsStore((state) => state.lineIndex);
  // const wordIndex = useLyricsStore((state) => state.wordIndex);
  // const setLineIndex = useLyricsStore((state) => state.setLineIndex);
  // const setWordIndex = useLyricsStore((state) => state.setWordIndex);
  // const isPlay = useMidiPlayerStore((state) => state.isPlay);
  // const stop = useMidiPlayerStore((state) => state.stop);

  // const cursors = useLyricsStore((state) => state.cursors);
  // const [preview, setPreview] = useState<boolean>(false);

  // const onLyricsChange = (lyrics: string[][]) => {
  //   // setCursor([]);
  //   cursors.clear();
  //   setLineIndex(0);
  //   setWordIndex(-1);
  //   setLyricsCuted(lyrics);
  // };

  // useEffect(() => {
  //   loadSegementer();
  //   loadSynth();
  // }, []);

  // useEffect(() => {
  //   const cuted = wordsCutText?.(lyrics) ?? [];
  //   setLyricsCuted(cuted);
  // }, [lyrics]);

  return (
    // <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 w-full h-full p-2">
    //   <ModalCommon
    //     open={preview}
    //     title="Preview"
    //     onClose={() => {
    //       setPreview(false);
    //       stop();
    //     }}
    //   >
    //     <LyricsPlayer></LyricsPlayer>
    //   </ModalCommon>
    //   <div className="col-span-1 lg:col-span-4 h-[400px] lg:h-full lg:overflow-auto border rounded-md">
    //     <div className="grid grid-row-6 w-full h-full">
    //       <LyricsSection
    //         disable={isPlay}
    //         lineCurrent={lineIndex}
    //         wordCurrent={wordIndex}
    //         onLyricsListChange={onLyricsChange}
    //       ></LyricsSection>
    //     </div>
    //   </div>
    //   <div className="col-span-1 lg:col-span-2 flex flex-col gap-2">
    //     <div className="border rounded-md p-4 bg-gray-50">
    //       <div className="w-full flex gap-2 items-center pb-2">
    //         <span className="text-xs text-gray-500 text-nowrap ">
    //           ตัวเล่นเพลง
    //         </span>
    //         <div className="w-full">
    //           <hr />
    //         </div>
    //       </div>
    //       <MidiPlayer></MidiPlayer>
    //     </div>

    //     <div className="border rounded-md p-4 bg-gray-50">
    //       <div className="w-full flex gap-2 items-center pb-2">
    //         <span className="text-xs text-gray-500 text-nowrap ">
    //           ปาดเนื้อเพลง
    //         </span>
    //         <div className="w-full">
    //           <hr />
    //         </div>
    //       </div>
    //       <TouchNextLyr></TouchNextLyr>
    //     </div>
    //     <div className="border rounded-md p-4 bg-gray-50">
    //       <div className="w-full flex gap-2 items-center pb-2">
    //         <span className="text-xs text-gray-500 text-nowrap ">
    //           รายละเอียดเพลง
    //         </span>
    //         <div className="w-full">
    //           <hr />
    //         </div>
    //       </div>
    //       <MusicDetailForm></MusicDetailForm>
    //     </div>
    //     <div className="border rounded-md p-4 bg-gray-50">
    //       <div className="w-full flex gap-2 items-center pb-2">
    //         <span className="text-xs text-gray-500 text-nowrap ">ส่งออก</span>
    //         <div className="w-full">
    //           <hr />
    //         </div>
    //       </div>
    //       <div className="flex gap-2">
    //         <ButtonCommon
    //           onClick={() => setPreview(true)}
    //           color="warning"
    //           icon={<BsFileEarmarkPlayFill></BsFileEarmarkPlayFill>}
    //         >
    //           Preview
    //         </ButtonCommon>
    //       </div>
    //     </div>
    //   </div>
    // </div>
    <>
      <Home
        exportData={(d) => {
          const gen = new TimestampLyricSegmentGenerator();
          const data = gen.generateSegment(d);
          console.log(data);
        }}
      ></Home>
    </>
  );
};

export default HomePage;
