import React, { useEffect, useState } from "react";
import ModalCommon from "../../common/modal";
import ButtonCommon from "@/components/common/button";
import Donate from "../donate/donate";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { groupWordDataToEvents } from "@/lib/karaoke/lyrics/convert";
import {
  DEFAULT_PRE_ROLL_OFFSET_MIDI,
  DEFAULT_PRE_ROLL_OFFSET_MP3,
} from "@/stores/karaoke-store/configs";
import { LyrBuilder } from "@/lib/karaoke/lyrics";
import { TickLyricSegmentGenerator, tickToCursor } from "@/lib/karaoke/cursor";
import { MdOutlineFileDownload } from "react-icons/md";
import { buildModifiedMidi } from "@/lib/karaoke/midi/builder";
import {
  LyricEvent,
  SongInfo,
  ChordEvent,
  IMidiParseResult,
} from "@/lib/karaoke/midi/types";
import { buildMp3 } from "@/lib/karaoke/mp3/builder";

interface BuildNcnModalProps {
  open?: boolean;
  onClose?: () => void;
}

const BuildNcnModal: React.FC<BuildNcnModalProps> = ({ open, onClose }) => {
  const storedFile = useKaraokeStore((state) => state.playerState.storedFile);
  const chordsData = useKaraokeStore((state) => state.chordsData);
  const midiInfo = useKaraokeStore((state) => state.playerState.midi);
  const mode = useKaraokeStore((state) => state.mode);
  const metadata = useKaraokeStore((state) => state.metadata);
  const lyricsData = useKaraokeStore((state) => state.lyricsData);

  const [openModal, setOpenModal] = useState<boolean>(false);
  const handleCloseModal = () => {
    setOpenModal(false);
    onClose?.();
  };

  const validation = () => {
    if (!metadata?.TITLE) return alert("ยังไม่ได้ตั้งชื่อเพลง");
    if (!metadata?.ARTIST) return alert("ยังไม่ได้ตั้งชื่อนักร้อง");
    if (!metadata?.KEY) return alert("ยังไม่ได้ใส่ Key");
  };

  const handleSaveMp3 = async () => {
    validation();
    if (!metadata || !storedFile) return;
    try {
      const flatLyrics = lyricsData.flat();

      const newLyricsData = groupWordDataToEvents(
        flatLyrics,
        (tick) => (tick + DEFAULT_PRE_ROLL_OFFSET_MP3) * 1000
      );

      let newChordsData = chordsData.map((x) => ({
        ...x,
        tick: Math.floor((x.tick + DEFAULT_PRE_ROLL_OFFSET_MP3) * 1000),
      }));

      metadata.TIME_FORMAT = "TIME_MS";
      metadata.CHARSET = undefined;
      const buffer = buildMp3(
        {
          title: metadata.TITLE,
          album: metadata.ALBUM,
          artist: metadata.ARTIST,
          chords: newChordsData,
          info: metadata,
          lyrics: newLyricsData,
        },
        storedFile.buffer
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
    validation();
    if (!metadata || !midiInfo) return;
    try {
      const flatLyrics = lyricsData.flat();

      let newLyricsData: LyricEvent[][] = groupWordDataToEvents(
        flatLyrics,
        (tick) => {
          const bpm = midiInfo.tempos.search(tick)?.lyrics.value.bpm ?? 120;
          const offsetTicks =
            (DEFAULT_PRE_ROLL_OFFSET_MIDI * midiInfo.ticksPerBeat * bpm) / 60;
          return tickToCursor(tick + offsetTicks, midiInfo.ticksPerBeat);
        }
      );

      const newSongInfo: SongInfo = metadata;
      const newChordsData: ChordEvent[] = chordsData;

      newSongInfo.TIME_FORMAT = newSongInfo.TIME_FORMAT
        ? newSongInfo.TIME_FORMAT
        : "MIDI_TIME_24";

      if (newLyricsData.length > 3) {
        newSongInfo.LYRIC_TITLE = newLyricsData
          .map((line) => line.map((w) => w.text))
          .slice(0, 3)
          .join(" ");
      }

      const newMidiBuffer = buildModifiedMidi({
        originalMidiData: { ...midiInfo },
        newSongInfo,
        newLyricsData,
        newChordsData,
        headerToUse: midiInfo.lyrHeader,
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
    lyr.downloadFile(`${storedFile?.name.split(".")[0]}.lyr`);
  };

  const buildCur = () => {
    validation();
    if (mode === "midi" && midiInfo) {
      const flatLyrics = lyricsData.flat();
      const generator = new TickLyricSegmentGenerator(midiInfo.ticksPerBeat);

      const timestamps = generator.generateSegment(flatLyrics, (tick) => {
        const bpm = midiInfo.tempos.search(tick)?.lyrics.value.bpm ?? 120;
        const offsetTicks =
          (DEFAULT_PRE_ROLL_OFFSET_MIDI * midiInfo.ticksPerBeat * bpm) / 60;
        return offsetTicks;
      });

      if (timestamps.length === 0) {
        alert("ยังไม่มี Timestamps");
        return;
      }
      generator.export();
      generator.downloadFile(`${storedFile?.name.split(".")[0]}.cur`);
    }
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
        {storedFile && lyricsData.length > 0 ? (
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
