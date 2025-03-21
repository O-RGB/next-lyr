import ButtonCommon from "@/components/button/button";
import { CurBuilder } from "@/lib/karaoke/builder/cur-builder";
import { LyrBuilder } from "@/lib/karaoke/builder/lyr-builder";
import useLyricsStore from "@/stores/lyrics-store";
import React, { useEffect, useState } from "react";
import { FaFile } from "react-icons/fa";

interface LyrExportProps {}

const LyrExport: React.FC<LyrExportProps> = ({}) => {
  const lyricsCuted = useLyricsStore((state) => state.lyricsCuted);
  const songDetail = useLyricsStore((state) => state.songDetail);

  const [build, setBuild] = useState<LyrBuilder>();

  const loadLyr = () => {
    if (songDetail) {
      const lyrBuild = new LyrBuilder({
        ...songDetail,
        lyrics: lyricsCuted.map((v) => v.join("")),
      });
      setBuild(lyrBuild);
    }
  };
  const download = () => {
    if (!build) return;
    build.downloadFile("song.lyr");
  };

  useEffect(() => {
    loadLyr();
  }, []);

  return (
    <>
      <ButtonCommon
        disabled={!build}
        onClick={download}
        icon={<FaFile></FaFile>}
      >
        .lyr
      </ButtonCommon>
    </>
  );
};

export default LyrExport;
