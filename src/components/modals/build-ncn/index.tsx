import React, { useEffect, useState } from "react";
import ModalCommon from "../../common/modal";
import { LyrBuilder } from "@/lib/karaoke/lyrics/generator";
import curGenerator, {
  TickLyricSegmentGenerator,
} from "@/lib/karaoke/cur-generator";
import { useKaraokeStore } from "@/stores/karaoke-store";
import ButtonCommon from "@/components/common/button";
import { MdOutlineFileDownload } from "react-icons/md";
import Donate from "../donate/donate";

interface BuildNcnModalProps {
  open?: boolean;
  onClose?: () => void;
}

const BuildNcnModal: React.FC<BuildNcnModalProps> = ({ open, onClose }) => {
  const midiInfo = useKaraokeStore((state) => state.midiInfo);
  const mode = useKaraokeStore((state) => state.mode);
  const metadata = useKaraokeStore((state) => state.metadata);
  const lyricsData = useKaraokeStore((state) => state.lyricsData);

  const [openModal, setOpenModal] = useState<boolean>(false);
  const handleCloseModal = () => {
    setOpenModal(false);
    onClose?.();
  };

  const buildLyr = () => {
    const timedWords = lyricsData.filter(
      (w) => w.start !== null && w.end !== null
    );

    let timestamps: number[] = [];

    if (mode === "midi" && midiInfo) {
      const generator = new TickLyricSegmentGenerator(
        midiInfo.bpm,
        midiInfo.ppq
      );
      timestamps = generator.generateSegment(timedWords);

      if (timestamps.length === 0) {
        alert("ยังไม่มี Timestamps");
        return;
      }
      generator.export();
      generator.downloadFile(`${midiInfo?.fileName.split(".")[0]}.cur`);
    }
  };

  const buildCur = () => {
    if (!metadata?.TITLE) return alert("ยังไม่ได้ตั้งชื่อเพลง");
    if (!metadata?.ARTIST) return alert("ยังไม่ได้ตั้งชื่อนักร้อง");
    const lyrs: string[][] = [];
    const lyrInline: string[] = [];
    lyricsData.forEach((data) => {
      if (!lyrs[data.lineIndex]) lyrs[data.lineIndex] = [];
      lyrs[data.lineIndex].push(data.name);

      if (!lyrInline[data.lineIndex]) lyrInline.push("");
      lyrInline[data.lineIndex] = lyrInline[data.lineIndex] + data.name;
    });

    const lyr = new LyrBuilder({
      name: metadata.TITLE,
      artist: metadata.ARTIST,
      key: metadata.KEY,
      lyrics: lyrInline,
    });

    lyr.getFileContent();
    lyr.downloadFile(`${midiInfo?.fileName.split(".")[0]}.lyr`);
  };

  useEffect(() => {
    setOpenModal(open ?? false);
  }, [open]);
  return (
    <>
      <ModalCommon
        modalId="save-ncn"
        title="บันทึก"
        open={openModal}
        onClose={handleCloseModal}
        okButtonProps={{ hidden: true }}
        cancelButtonProps={{
          children: "Close",
        }}
      >
        <div className="grid grid-cols-2">
          <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-2xl shadow-sm">
            <p className="text-sm text-gray-600 font-medium">ดาวน์โหลดไฟล์</p>

            <ButtonCommon
              onClick={buildCur}
              color="primary"
              icon={<MdOutlineFileDownload className="text-lg" />}
            >
              ดาวน์โหลดไฟล์ <span className="font-bold">.cur</span>
            </ButtonCommon>

            <ButtonCommon
              onClick={buildLyr}
              color="success"
              icon={<MdOutlineFileDownload className="text-lg" />}
            >
              ดาวน์โหลดไฟล์ <span className="font-bold">.lyr</span>
            </ButtonCommon>
          </div>
          <Donate show={false}></Donate>
        </div>
      </ModalCommon>
    </>
  );
};

export default BuildNcnModal;
