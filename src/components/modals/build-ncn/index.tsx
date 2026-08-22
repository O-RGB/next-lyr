import { AlertTriangle, Download } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import ModalCommon from "../../common/modal";
import ButtonCommon from "@/components/common/button";
import Donate from "../donate/donate";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { groupWordDataToEvents } from "@/lib/karaoke/lyrics/convert";
import { LyrBuilder } from "@/lib/karaoke/lyrics";
import { TickLyricSegmentGenerator } from "@/lib/karaoke/cursor";
import { lyricsDocumentToEvents } from "@/lib/karaoke/lyrics-core/timeline";
import { buildModifiedMidi } from "@/lib/karaoke/midi/builder";
import { LyricEvent, SongInfo, ChordEvent } from "@/lib/karaoke/midi/types";
import { buildMp3 } from "@/lib/karaoke/mp3/builder";
import { getProject, Project } from "@/lib/database/db";
import {
  DEFAULT_PRE_ROLL_OFFSET_MIDI,
  DEFAULT_PRE_ROLL_OFFSET_MP3,
} from "@/stores/karaoke-store/configs";
import { isTIS620Compatible } from "@/lib/karaoke/shared/lib";
import { useUiStore } from "@/features/ui/ui-store";
import pako from "pako";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import MetadataForm from "@/components/metadata/metadata-form";
import { getMissingRequiredSongInfo } from "@/lib/karaoke/metadata-validation";

interface BuildNcnModalProps {
  open?: boolean;
  onClose?: () => void;
}

const BuildNcnModal: React.FC<BuildNcnModalProps> = ({ open, onClose }) => {
  const projectId = useKaraokeStore((state) => state.projectId);
  const storedFile = useKaraokeStore((state) => state.playerState.storedFile);
  const chordsData = useKaraokeStore((state) => state.chordsData);
  const midiInfo = useKaraokeStore((state) => state.playerState.midi);
  const mode = useKaraokeStore((state) => state.mode);
  const metadata = useKaraokeStore((state) => state.metadata);
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const lyricsDocument = useKaraokeStore((state) => state.lyricsDocument);
  const requestAlert = useUiStore((state) => state.requestAlert);
  const locale = useSettingsStore((state) => state.uiLocale);
  const legacyEncodingSupported = useMemo(() => {
    const metadataText = Object.values(metadata ?? {}).filter(
      (value): value is string => typeof value === "string"
    );
    const lyricText = lyricsData.flatMap((line) =>
      line.flatMap((word) => [word.text, word.vocal ?? ""])
    );
    const chordText = chordsData.map((chord) => chord.chord);

    return [...metadataText, ...lyricText, ...chordText].every(
      isTIS620Compatible
    );
  }, [chordsData, lyricsData, metadata]);

  const utf8CompatibilityMessage =
    text(
      locale,
      "มีภาษาอื่น จึงใช้ UTF-8 และไม่รองรับโปรแกรมคาราโอเกะไทย",
      "Other-language text requires UTF-8 and is not supported by Thai karaoke programs"
    );

  const [openModal, setOpenModal] = useState<boolean>(false);
  const [metadataModalOpen, setMetadataModalOpen] = useState(false);
  const handleCloseModal = () => {
    setMetadataModalOpen(false);
    setOpenModal(false);
    onClose?.();
  };

  const validation = () => {
    if (getMissingRequiredSongInfo(metadata).length > 0) {
      setMetadataModalOpen(true);
      return false;
    }
    return true;
  };

  const handleMetadataModalClose = () => {
    // The metadata form is intentionally blocking: its Save button is the
    // only way out, and only after all required values are present.
    if (getMissingRequiredSongInfo(useKaraokeStore.getState().metadata).length === 0) {
      setMetadataModalOpen(false);
    }
  };

  const handleMetadataSaved = () => {
    if (getMissingRequiredSongInfo(useKaraokeStore.getState().metadata).length === 0) {
      setMetadataModalOpen(false);
    }
  };

  const handleBuildYoutube = async () => {
    if (!(await validation()) || !metadata) return;
    if (!projectId) return;
    const project = await getProject(projectId);
    if (!project) return;
      const flatLyrics = lyricsData.flat();

      const newLyricsData = lyricsDocument
        ? lyricsDocumentToEvents(lyricsDocument)
        : groupWordDataToEvents(
            flatLyrics,
            (tick) => (tick - (DEFAULT_PRE_ROLL_OFFSET_MP3 + 0.5)) * 1000
          );

      let newChordsData = chordsData.map((x) => ({
        ...x,
        tick: lyricsDocument
          ? Math.floor(x.tick * 1000)
          : Math.floor(
              (x.tick - (DEFAULT_PRE_ROLL_OFFSET_MP3 + 0.5)) * 1000
            ),
      }));

    const json = JSON.stringify({
      ...project,
      data: { ...project.data, newLyricsData, chordsData: newChordsData },
    } as Project);

    console.log("json", project.data.metadata);
    const compressed = pako.gzip(json);
    const blob = new Blob([compressed], { type: "application/octet-stream" });
    const filename = `${metadata.TITLE || "project"}.ykr`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveMp3 = async () => {
    if (!(await validation())) return;
    if (!metadata || !storedFile) return;
    try {
      const flatLyrics = lyricsData.flat();

      const newLyricsData = lyricsDocument
        ? lyricsDocumentToEvents(lyricsDocument)
        : groupWordDataToEvents(
            flatLyrics,
            (tick) => (tick + DEFAULT_PRE_ROLL_OFFSET_MP3) * 1000
          );

      let newChordsData = chordsData.map((x) => ({
        ...x,
        tick: lyricsDocument
          ? Math.floor(x.tick * 1000)
          : Math.floor((x.tick + DEFAULT_PRE_ROLL_OFFSET_MP3) * 1000),
      }));

      const mp3Info: SongInfo = {
        ...metadata,
        TIME_FORMAT: "TIME_MS",
        CHARSET: legacyEncodingSupported ? "TIS-620" : "UTF-8",
      };
      const buffer = buildMp3(
        {
          title: mp3Info.TITLE,
          album: mp3Info.ALBUM,
          artist: mp3Info.ARTIST,
          chords: newChordsData,
          info: mp3Info,
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

  const handleSaveMidi = async () => {
    if (!(await validation())) return;
    if (!metadata || !midiInfo) return;
    try {
      const flatLyrics = lyricsData.flat();

      let newLyricsData: LyricEvent[][] = lyricsDocument
        ? lyricsDocumentToEvents(lyricsDocument)
        : groupWordDataToEvents(flatLyrics, (tick) => {
            // Real ticks only — buildKLyrXML scales to cursor units on write.
            const bpm = midiInfo.tempos.search(tick)?.lyrics.value.bpm ?? 120;
            const offsetTicks =
              (DEFAULT_PRE_ROLL_OFFSET_MIDI * midiInfo.ticksPerBeat * bpm) / 60;
            return Math.round(tick + offsetTicks);
          });

      const newSongInfo: SongInfo = {
        ...metadata,
        CHARSET: legacyEncodingSupported ? "TIS-620" : "UTF-8",
      };
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
        textEncoding: legacyEncodingSupported ? "tis-620" : "utf-8",
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

  const buildLyr = async () => {
    if (!(await validation()) || !metadata) return;
    if (!legacyEncodingSupported) {
      await requestAlert({
        title: text(locale, "ไม่รองรับการส่งออกแบบเก่า", "Legacy export is unavailable"),
        description: utf8CompatibilityMessage,
        tone: "info",
      });
      return;
    }
    const lyrInline: string[] = lyricsData.map((line) =>
      line.map((word) => word.text).join("")
    );

    const lyr = new LyrBuilder({
      name: metadata.TITLE,
      artist: metadata.ARTIST,
      key: metadata.KEY ?? "",
      lyrics: lyrInline,
    });

    lyr.getFileContent();
    lyr.downloadFile(`${storedFile?.name.split(".")[0]}.lyr`);
  };

  const buildCur = async () => {
    if (!(await validation())) return;
    if (!legacyEncodingSupported) {
      await requestAlert({
        title: text(locale, "ไม่รองรับการส่งออกแบบเก่า", "Legacy export is unavailable"),
        description: utf8CompatibilityMessage,
        tone: "info",
      });
      return;
    }
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
        await requestAlert({
          title: text(locale, "ยังไม่มี Timestamps", "No timestamps yet"),
          description: text(locale, "กรุณาปาดเวลาเนื้อร้องก่อนส่งออกไฟล์ CUR", "Time the lyrics before exporting a CUR file"),
          tone: "info",
        });
        return;
      }
      generator.export();
      generator.downloadFile(`${storedFile?.name.split(".")[0]}.cur`);
    }
  };

  useEffect(() => {
    setOpenModal(open ?? false);
    if (!open) setMetadataModalOpen(false);
  }, [open]);

  return (
    <>
      <ModalCommon
        title={text(locale, "บันทึก / ส่งออก", "Save / export")}
        open={openModal}
        onClose={handleCloseModal}
        okButtonProps={{ hidden: true }}
        cancelButtonProps={{
          children: text(locale, "ปิด", "Close"),
        }}
      >
        {(mode !== "youtube" ? storedFile : true) && lyricsData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="flex flex-col gap-2 p-4 bg-panel-2 rounded-2xl shadow-sm">
              <p className="text-sm text-foreground font-medium">{text(locale, "ดาวน์โหลดไฟล์", "Download files")}</p>
              {mode === "midi" && (
                <>
                  <ButtonCommon
                    onClick={buildCur}
                    disabled={!legacyEncodingSupported}
                    color="primary"
                    icon={<Download className="text-lg" />}
                  >
                    {text(locale, "ดาวน์โหลดไฟล์", "Download")} <span className="font-bold">.cur</span>
                  </ButtonCommon>

                  <ButtonCommon
                    onClick={buildLyr}
                    disabled={!legacyEncodingSupported}
                    color="success"
                    icon={<Download className="text-lg" />}
                  >
                    {text(locale, "ดาวน์โหลดไฟล์", "Download")} <span className="font-bold">.lyr</span>
                  </ButtonCommon>

                  <hr />

                  <ButtonCommon
                    onClick={handleSaveMidi}
                    color="secondary"
                    icon={<Download className="text-lg" />}
                  >
                    {text(locale, "บันทึก", "Save")} <span className="font-bold">.mid</span>
                  </ButtonCommon>
                  {!legacyEncodingSupported && (
                    <p className="flex items-center gap-2 text-xs text-warn">
                      <AlertTriangle className="size-4 shrink-0" />
                      <span>{utf8CompatibilityMessage}</span>
                    </p>
                  )}
                </>
              )}
              {mode === "mp3" && (
                <>
                  <ButtonCommon
                    onClick={handleSaveMp3}
                    color="secondary"
                    icon={<Download className="text-lg" />}
                  >
                    {text(locale, "บันทึก", "Save")} <span className="font-bold">.mp3</span>
                  </ButtonCommon>
                  {!legacyEncodingSupported && (
                    <p className="flex items-center gap-2 text-xs text-warn">
                      <AlertTriangle className="size-4 shrink-0" />
                      <span>{utf8CompatibilityMessage}</span>
                    </p>
                  )}
                </>
              )}
              {mode === "youtube" && (
                <ButtonCommon
                  onClick={handleBuildYoutube}
                  color="secondary"
                  icon={<Download className="text-lg" />}
                >
                  {text(locale, "บันทึก", "Save")} <span className="font-bold">.ykr</span>
                </ButtonCommon>
              )}
            </div>
            <Donate show={false}></Donate>
          </div>
        ) : (
          <>{text(locale, "กรุณาเริ่มสร้างเนื้อร้องก่อน", "Add lyrics before exporting")}</>
        )}
      </ModalCommon>
      <ModalCommon
        title={text(locale, "กรอกข้อมูลเพลงที่จำเป็น", "Complete required metadata")}
        open={metadataModalOpen}
        onClose={handleMetadataModalClose}
        showCloseButton={false}
        modalClassName="flex flex-col"
        okButtonProps={{
          children: text(locale, "บันทึก", "Save"),
          form: "export-metadata-form",
          type: "submit",
        }}
        cancelButtonProps={null}
      >
        <MetadataForm
          card={false}
          requiredFirst
          inputSize="md"
          className="flex flex-col gap-3"
          autoSave={false}
          formId="export-metadata-form"
          showRequiredErrors
          validateRequiredOnSave
          onSave={handleMetadataSaved}
        />
      </ModalCommon>
    </>
  );
};

export default BuildNcnModal;
