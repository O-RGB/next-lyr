import ButtonCommon from "@/components/button/button";
import { CurBuilder } from "@/lib/karaoke/builder/cur-builder";
import { LyrBuilder } from "@/lib/karaoke/builder/lyr-builder";
import useLyricsStore from "@/stores/lyrics-store";
import React from "react";
import { FaFile } from "react-icons/fa";

interface LyrExportProps {}

const LyrExport: React.FC<LyrExportProps> = ({}) => {
  const lyrics = useLyricsStore((state) => state.lyrics);
  const songDetail = useLyricsStore((state) => state.songDetail);

  const loadLyr = () => {
    if (songDetail) {
      const lyrBuild = new LyrBuilder({
        ...songDetail,
        lyrics: lyrics,
      });
      lyrBuild.downloadFile("song.lyr");
    }
  };

  return (
    <>
      <ButtonCommon
        // disabled={!songDetail}
        onClick={loadLyr}
        icon={<FaFile></FaFile>}
      >
        .lyr
      </ButtonCommon>
    </>
  );
};

export default LyrExport;
