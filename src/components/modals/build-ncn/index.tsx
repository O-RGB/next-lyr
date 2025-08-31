import React, { useCallback, useEffect, useState } from "react";
import ModalCommon from "../../common/modal";
import { LyrBuilder } from "@/lib/karaoke/lyrics/generator";
import { TickLyricSegmentGenerator } from "@/lib/karaoke/cur-generator";
import { useKaraokeStore } from "@/stores/karaoke-store";
import ButtonCommon from "@/components/common/button";
import { MdOutlineFileDownload } from "react-icons/md";
import Donate from "../donate/donate";
import {
  buildModifiedMidi,
  ChordEvent,
  SongInfo,
} from "@/modules/midi-klyr-parser/lib/processor";
import { LyricEvent } from "@/modules/midi-klyr-parser/klyr-parser-lib";
import { buildMp3 } from "@/modules/mp3-klyr-parser/builder";
import { groupWordDataToEvents } from "@/lib/karaoke/lyrics/lyrics-convert";
import { DEFAULT_PRE_ROLL_OFFSET } from "@/stores/karaoke-store/configs";

interface BuildNcnModalProps {
  open?: boolean;
  onClose?: () => void;
}

const BuildNcnModal: React.FC<BuildNcnModalProps> = ({ open, onClose }) => {
  const rawFile = useKaraokeStore((state) => state.playerState.rawFile);
  const chordsData = useKaraokeStore((state) => state.chordsData);
  const midiInfo = useKaraokeStore((state) => state.playerState.midiInfo);
  const mode = useKaraokeStore((state) => state.mode);
  const metadata = useKaraokeStore((state) => state.metadata);
  const lyricsData = useKaraokeStore((state) => state.lyricsData);

  const [openModal, setOpenModal] = useState<boolean>(false);
  const handleCloseModal = () => {
    setOpenModal(false);
    onClose?.();
  };

  const handleSaveMp3 = async () => {
    if (!metadata || !rawFile) return;
    try {
      const flatLyrics = lyricsData.flat();

      const newLyricsData = groupWordDataToEvents(
        flatLyrics,
        (tick) => (tick + DEFAULT_PRE_ROLL_OFFSET) * 1000
      );

      let newChordsData = chordsData.map((x) => ({
        ...x,
        tick: Math.floor((x.tick + DEFAULT_PRE_ROLL_OFFSET) * 1000),
      }));

      metadata.TIME_FORMAT = "TIME_MS";
      const buffer = buildMp3(
        {
          title: metadata.TITLE,
          album: metadata.ALBUM,
          artist: metadata.ARTIST,
          chords: newChordsData,
          info: metadata,
          lyrics: newLyricsData,
        },
        await rawFile.arrayBuffer()
      );
      const blob = new Blob([buffer], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${metadata.TITLE || "edited_song"}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      const err = error as Error;
      console.error("Error saving MIDI file:", err);
    }
  };

  const handleSaveMidi = () => {
    if (!metadata || !midiInfo) return;
    try {
      const flatLyrics = lyricsData.flat();
      const generator = new TickLyricSegmentGenerator(
        midiInfo.bpm,
        midiInfo.ppq
      );

      let newLyricsData: LyricEvent[][] =
        generator.convertLyricsWordToCursor(flatLyrics);

      const newSongInfo: SongInfo = metadata;
      const newChordsData: ChordEvent[] = chordsData;

      const newMidiBuffer = buildModifiedMidi({
        originalMidiData: midiInfo.raw.midiData,
        newSongInfo,
        newLyricsData,
        newChordsData,
        headerToUse: midiInfo.raw.detectedHeader,
      });

      const blob = new Blob([newMidiBuffer as BlobPart], {
        type: "audio/midi",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${newSongInfo.TITLE || "edited_song"}.mid`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      const err = error as Error;
      console.error("Error saving MIDI file:", err);
    }
  };

  const buildLyr = () => {
    const flatLyrics = lyricsData.flat();
    const timedWords = flatLyrics.filter(
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
    if (!metadata?.KEY) return alert("ยังไม่ได้ใส่ Key");
    const lyrInline: string[] = lyricsData.map((line) =>
      line.map((word) => word.name).join("")
    );

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
        {rawFile && lyricsData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-2xl shadow-sm">
              <p className="text-sm text-gray-600 font-medium">ดาวน์โหลดไฟล์</p>
              {mode === "midi" && (
                <>
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

                  <hr />

                  <ButtonCommon
                    onClick={handleSaveMidi}
                    color="secondary"
                    icon={<MdOutlineFileDownload className="text-lg" />}
                  >
                    บันทึก <span className="font-bold">.mid</span>
                  </ButtonCommon>
                </>
              )}
              {mode === "mp3" && (
                <ButtonCommon
                  onClick={handleSaveMp3}
                  color="secondary"
                  icon={<MdOutlineFileDownload className="text-lg" />}
                >
                  บันทึก <span className="font-bold">.mp3</span>
                </ButtonCommon>
              )}
            </div>
            <Donate show={false}></Donate>
          </div>
        ) : (
          <>กรุณาเริ่มสร้างเนื้อร้องก่อน</>
        )}
      </ModalCommon>
    </>
  );
};

export default BuildNcnModal;
