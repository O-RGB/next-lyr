"use client";

import ButtonCommon from "@/components/button/button";
import MusicDetailForm from "@/form/music-detail";
import { CurBuilder } from "@/lib/karaoke/builder/cur-builder";
import { LyrBuilder } from "@/lib/karaoke/builder/lyr-builder";
import useLyricsStore from "@/stores/lyrics-store";
import useMidiPlayerStore from "@/stores/midi-plyer-store";
import useSegementerStore from "@/stores/segmenter-store";
import LyricsSection from "@/tools/lyrics-box";
import MidiPlayer from "@/tools/midi-player";
import TouchNextLyr from "@/tools/touch-next-lyr";
import React, { useEffect, useState } from "react";
import { BsFileEarmarkPlayFill } from "react-icons/bs";
import { CiExport } from "react-icons/ci";
import { FaFile } from "react-icons/fa";
import { LuMonitorPlay } from "react-icons/lu";
import { MdLyrics } from "react-icons/md";

interface HomePageProps {}

const HomePage: React.FC<HomePageProps> = ({}) => {
  const lyrics = useLyricsStore((state) => state.lyrics);
  const setLyricsCuted = useLyricsStore((state) => state.setLyricsCuted);
  const wordsCutText = useSegementerStore((state) => state.wordsCutText);
  const loadSegementer = useSegementerStore((state) => state.loadSegementer);
  const loadSynth = useMidiPlayerStore((state) => state.loadSynth);
  const synth = useMidiPlayerStore((state) => state.synth);
  const [cursor, setCursor] = useState<number[]>([]);
  const lineIndex = useLyricsStore((state) => state.lineIndex);
  const wordIndex = useLyricsStore((state) => state.wordIndex);
  const setLineIndex = useLyricsStore((state) => state.setLineIndex);
  const setWordIndex = useLyricsStore((state) => state.setWordIndex);
  const isPlay = useMidiPlayerStore((state) => state.isPlay);

  const showTime = async (charIndex: number) => {
    const cursor = await synth?.player?.getCurrentTiming();
    if (cursor) {
      setCursor((v) => {
        let clone = [...v];
        clone[charIndex + 1] = cursor;
        return clone;
      });
    }
  };
  const onLyricsChange = (lyrics: string[][]) => {
    setCursor(Array(lyrics.reduce((c, r) => c + r.length, 0)).fill(0));
    setLineIndex(0);
    setWordIndex(-1);
    setLyricsCuted(lyrics);
  };

  const loadCur = () => {
    const curBuild = new CurBuilder([
      0, 14, 19, 24, 29, 40, 44, 48, 57, 60, 63, 68, 75, 82, 91, 96, 107, 111,
      115, 120, 124, 129, 131, 133, 165, 165, 169, 177, 180, 187, 197, 217, 220,
      223, 226, 236, 240, 244, 254, 257, 260, 263, 269, 275, 288, 290, 292, 294,
      296, 337, 337, 369, 433, 444, 455, 477, 485, 501, 527, 555, 583, 603, 630,
    ]);
    curBuild.downloadFile("song.cur");
  };

  const loadLyr = () => {
    const lyrBuild = new LyrBuilder({
      artist: "ไหมไทย",
      key: "cm",
      name: "นะหน้าทอง",
      lyrics: [
        "เพลง คนน่าฮักอกหักบ่คือ",
        "แสดงสด ไหมไทย หัวใจศิลป์",
        "Intro:>>>>>>",
        ">>>เป็นตาฮักกะด้อ",
        "เจ็บเป็นอยู่บ้อคนดี",
      ],
    });
    lyrBuild.downloadFile("song.lyr");
  };

  useEffect(() => {
    loadSegementer();
    loadSynth();
  }, []);

  useEffect(() => {
    const cuted = wordsCutText?.(lyrics) ?? [];
    setLyricsCuted(cuted);
  }, [lyrics]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 w-full h-full p-2">
      <div className="col-span-1 lg:col-span-4 h-[400px] lg:h-full lg:overflow-auto">
        <div className="grid grid-row-6 w-full h-full">
          <LyricsSection
            disable={isPlay}
            lineCurrent={lineIndex}
            wordCurrent={wordIndex}
            onLyricsListChange={onLyricsChange}
          ></LyricsSection>
        </div>
      </div>
      <div className="col-span-1 lg:col-span-2 flex flex-col gap-2">
        <div className="border rounded-md p-4 bg-gray-50">
          <div className="w-full flex gap-2 items-center pb-2">
            <span className="text-xs text-gray-500 text-nowrap ">
              ตัวเล่นเพลง
            </span>
            <div className="w-full">
              <hr />
            </div>
          </div>
          <MidiPlayer></MidiPlayer>
        </div>

        <div className="border rounded-md p-4 bg-gray-50">
          <div className="w-full flex gap-2 items-center pb-2">
            <span className="text-xs text-gray-500 text-nowrap ">
              ปาดเนื้อเพลง
            </span>
            <div className="w-full">
              <hr />
            </div>
          </div>
          <TouchNextLyr></TouchNextLyr>
        </div>
        <div className="border rounded-md p-4 bg-gray-50">
          <div className="w-full flex gap-2 items-center pb-2">
            <span className="text-xs text-gray-500 text-nowrap ">
              รายละเอียดเพลง
            </span>
            <div className="w-full">
              <hr />
            </div>
          </div>
          <MusicDetailForm></MusicDetailForm>
        </div>
        <div className="border rounded-md p-4 bg-gray-50">
          <div className="w-full flex gap-2 items-center pb-2">
            <span className="text-xs text-gray-500 text-nowrap ">ส่งออก</span>
            <div className="w-full">
              <hr />
            </div>
          </div>
          <div className="flex gap-2">
            <ButtonCommon icon={<FaFile></FaFile>}>.cur</ButtonCommon>
            <ButtonCommon icon={<FaFile></FaFile>}>.lyr</ButtonCommon>
            <ButtonCommon
              color="warning"
              icon={<BsFileEarmarkPlayFill></BsFileEarmarkPlayFill>}
            >
              Preview
            </ButtonCommon>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
