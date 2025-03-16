import ButtonCommon from "@/components/button/button";
import { CurBuilder } from "@/lib/karaoke/builder/cur-builder";
import useLyricsStore from "@/stores/lyrics-store";
import useMidiPlayerStore from "@/stores/midi-plyer-store";
import React from "react";
import { FaFile } from "react-icons/fa";

interface CurExportProps {}

const CurExport: React.FC<CurExportProps> = ({}) => {
  const setCursorPreveiw = useLyricsStore((state) => state.setCursorPreveiw);
  const lyricsCuted = useLyricsStore((state) => state.lyricsCuted);
  const getCursor = useLyricsStore((state) => state.getCursor);
  const synth = useMidiPlayerStore((state) => state.synth);
  const midiPlaying = useMidiPlayerStore((state) => state.midiPlaying);
  const loadCur = async () => {
    const tpb = midiPlaying?.header.ticksPerBeat;
    if (tpb) {
      const cursor = getCursor();

      const bpm = await synth?.player?.getCurrentBPM();
      if (bpm) {
        const curBuild = new CurBuilder(cursor, lyricsCuted, tpb, bpm);
        console.log(lyricsCuted, cursor);
        setCursorPreveiw(curBuild.getCursor());
        curBuild.downloadFile("song.cur");
      }
    }
  };
  return (
    <>
      <ButtonCommon onClick={loadCur} icon={<FaFile></FaFile>}>
        .cur
      </ButtonCommon>
    </>
  );
};

export default CurExport;
