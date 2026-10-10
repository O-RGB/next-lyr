import { AlertTriangle, Download } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import ModalCommon from "../../common/modal";
import ButtonCommon from "@/components/common/button";
import Donate from "../donate/donate";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { groupWordDataToEvents } from "@/lib/karaoke/lyrics/convert";
import { LyrBuilder } from "@/lib/karaoke/lyrics";
import { TickLyricSegmentGenerator } from "@/lib/karaoke/cursor";
import { wordDataToLyricsDocument } from "@/lib/karaoke/lyrics-core/timeline";
import { buildPlaybackKlyrXml } from "@/lib/karaoke/lyrics-core/xml";
import { collectEffectAtlases } from "@/lib/block-effects/frames";
import { normalizeBlockEffect } from "@/lib/block-effects/types";
import { collectPlaybackAssets, buildYoutubePlayback } from "@/lib/stickers/playback-assets";
import { lyricsDocumentToEvents } from "@/lib/karaoke/lyrics-core/timeline";
import { buildModifiedMidi } from "@/lib/karaoke/midi/builder";
import { LyricEvent, SongInfo, ChordEvent } from "@/lib/karaoke/midi/types";
import { buildMp3 } from "@/lib/karaoke/mp3/builder";
import { getStickerBlob } from "@/lib/database/db";
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
      line.filter((word) => word.kind !== "image").flatMap((word) => [word.text, word.vocal ?? ""])
    );
    const chordText = chordsData.map((chord) => chord.chord);

    return [...metadataText, ...lyricText, ...chordText].every(
      isTIS620Compatible
    );
  }, [chordsData, lyricsData, metadata]);

  const hasImages = lyricsData.some((line) => line.some((word) => word.kind === "image"));
  const hasEffects = lyricsData.some((line) => line.some((word) => normalizeBlockEffect(word.effect)));
  const legacySupported = legacyEncodingSupported && !hasImages && !hasEffects;
  const utf8CompatibilityMessage =
    text(
      locale,
      "มีภาษาอื่น จึงใช้ UTF-8 และไม่รองรับโปรแกรมคาราโอเกะไทย",
      "Other-language text requires UTF-8 and is not supported by Thai karaoke programs"
    );

  const [openModal, setOpenModal] = useState<boolean>(false);
  const [metadataModalOpen, setMetadataModalOpen] = useState(false);
  const [metadataDirty, setMetadataDirty] = useState(false);
  const [metadataFormVersion, setMetadataFormVersion] = useState(0);
  const handleCloseModal = () => {
    setMetadataModalOpen(false);
    setOpenModal(false);
    onClose?.();
  };

  const validation = () => {
    if (getMissingRequiredSongInfo(metadata).length > 0) {
      setMetadataDirty(false);
      setMetadataFormVersion((version) => version + 1);
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
      setMetadataDirty(false);
      setMetadataModalOpen(false);
    }
  };

  const currentDocument = () => ({ ...wordDataToLyricsDocument({
    lyricsData, source: mode === "midi" ? "KMID" : "MP3",
    timeBase: lyricsDocument?.timeBase ?? (mode === "midi" ? { kind: "midi-tick", ppq: midiInfo?.ticksPerBeat ?? 480 } : { kind: "seconds" }),
    info: metadata ?? {},
  }), effectAtlases: lyricsDocument?.effectAtlases });
  const playbackXml = async (info: Partial<SongInfo>) => {
    if (!hasImages && !hasEffects) return undefined;
    const document = { ...currentDocument(), info };
    const assets = await collectPlaybackAssets(document, (id) => getStickerBlob(projectId ?? "", id));
    return buildPlaybackKlyrXml(document, assets, await collectEffectAtlases(document));
  };
  const exportError = async (error: unknown) => {
    console.error("Playback export failed", error);
    await requestAlert({ title: text(locale, "ส่งออกไม่สำเร็จ", "Export failed"),
      description: text(locale, "ไม่สามารถอ่านหรือรวมไฟล์ที่เพลงนี้ใช้ได้ งานในโปรเจกต์ยังอยู่ กรุณาลองใหม่", "Could not read or package this song's files. Your project is saved; please try again"), tone: "info" });
  };

  const handleBuildYoutube = async () => {
    if (!(await validation()) || !metadata) return;
    try {
      const flatLyrics = lyricsData.flat();

      const newLyricsData = lyricsDocument
        ? lyricsDocumentToEvents(lyricsDocument)
        : groupWordDataToEvents(
            flatLyrics,
            (tick) => (tick - (DEFAULT_PRE_ROLL_OFFSET_MP3 + 0.5)) * 1000
          );

      const newChordsData = chordsData.map((x) => ({
        ...x,
        tick: lyricsDocument
          ? Math.floor(x.tick * 1000)
          : Math.floor(
              (x.tick - (DEFAULT_PRE_ROLL_OFFSET_MP3 + 0.5)) * 1000
            ),
      }));

    const playbackDocument = currentDocument();
    const assets = await collectPlaybackAssets(playbackDocument, (id) => getStickerBlob(projectId ?? "", id));
    const youtubeId = useKaraokeStore.getState().playerState.youtubeId;
    if (!youtubeId) throw new Error("missing-youtube-id");
    const json = JSON.stringify(buildYoutubePlayback({ youtubeId, info: metadata, lyrics: newLyricsData,
      chords: newChordsData, document: playbackDocument, assets, effectAtlases: await collectEffectAtlases(playbackDocument) }));

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
    } catch (error) { await exportError(error); }
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

      const newChordsData = chordsData.map((x) => ({
        ...x,
        tick: lyricsDocument
          ? Math.floor(x.tick * 1000)
          : Math.floor((x.tick + DEFAULT_PRE_ROLL_OFFSET_MP3) * 1000),
      }));

      const mp3Info: SongInfo = {
        ...metadata,
        TIME_FORMAT: "TIME_MS",
        CHARSET: legacyEncodingSupported && !hasImages && !hasEffects ? "TIS-620" : "UTF-8",
      };
      const buffer = buildMp3(
        {
          title: mp3Info.TITLE,
          album: mp3Info.ALBUM,
          artist: mp3Info.ARTIST,
          chords: newChordsData,
          info: mp3Info,
          lyrics: newLyricsData,
          lyricsXml: await playbackXml(mp3Info),
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
      await exportError(error);
    }
  };

  const handleSaveMidi = async () => {
    if (!(await validation())) return;
    if (!metadata || !midiInfo) return;
    try {
      const flatLyrics = lyricsData.flat();

      const newLyricsData: LyricEvent[][] = lyricsDocument
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
        CHARSET: legacyEncodingSupported && !hasImages && !hasEffects ? "TIS-620" : "UTF-8",
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
        lyricsXml: await playbackXml(newSongInfo),
        newSongInfo,
        newLyricsData,
        newChordsData,
        headerToUse: midiInfo.lyrHeader,
        textEncoding: legacyEncodingSupported && !hasImages && !hasEffects ? "tis-620" : "utf-8",
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
      await exportError(error);
    }
  };

  const buildLyr = async () => {
    if (!(await validation()) || !metadata) return;
    if (!legacySupported) {
      await requestAlert({
        title: text(locale, "ไม่รองรับการส่งออกแบบเก่า", "Legacy export is unavailable"),
        description: hasImages || hasEffects ? text(locale, "LYR/CUR เก็บภาพหรือเอฟเฟกต์ไม่ได้ กรุณาส่งออก MID ซึ่งรวมให้ครบ", "LYR/CUR cannot carry images or effects. Export MID to include them") : utf8CompatibilityMessage,
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
    if (!legacySupported) {
      await requestAlert({
        title: text(locale, "ไม่รองรับการส่งออกแบบเก่า", "Legacy export is unavailable"),
        description: hasImages || hasEffects ? text(locale, "LYR/CUR เก็บภาพหรือเอฟเฟกต์ไม่ได้ กรุณาส่งออก MID ซึ่งรวมให้ครบ", "LYR/CUR cannot carry images or effects. Export MID to include them") : utf8CompatibilityMessage,
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
                    disabled={!legacySupported}
                    color="primary"
                    icon={<Download className="text-lg" />}
                  >
                    {text(locale, "ดาวน์โหลดไฟล์", "Download")} <span className="font-bold">.cur</span>
                  </ButtonCommon>

                  <ButtonCommon
                    onClick={buildLyr}
                    disabled={!legacySupported}
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
              {(hasImages || hasEffects) && <p className="text-xs text-muted-foreground">{text(locale,
                "ไฟล์รวมภาพและเอฟเฟกต์ที่ใช้จริง เก็บชุดซ้ำครั้งเดียว ต้องใช้ตัวเล่นที่รองรับบล็อกภาพและเอฟเฟกต์ · LYR/CUR ไม่รองรับ",
                "Includes only used images and effect presets, once each. Requires a player supporting image blocks and effects. LYR/CUR cannot carry them")}</p>}
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
        description={text(
          locale,
          "คุณยังกรอกข้อมูลเพลงที่จำเป็นไม่ครบ กรุณากรอกและกดบันทึกก่อนส่งออก แบบฟอร์มนี้เป็นขั้นตอนของ Export ไม่ใช่หน้าต่างแก้ไขข้อมูลปกติ",
          "Required song information is incomplete. Complete it and save before exporting. This is the Export form, not the normal metadata editor."
        )}
        open={metadataModalOpen}
        onClose={handleMetadataModalClose}
        showCloseButton={false}
        modalClassName="flex flex-col"
        okButtonProps={{
          children: text(locale, "บันทึก", "Save"),
          form: "export-metadata-form",
          type: "submit",
          disabled: !metadataDirty,
        }}
        cancelButtonProps={null}
      >
        <MetadataForm
          key={metadataFormVersion}
          card={false}
          requiredFirst
          inputSize="md"
          className="flex flex-col gap-3"
          autoSave={false}
          formId="export-metadata-form"
          onDirtyChange={setMetadataDirty}
          showRequiredErrors
          validateRequiredOnSave
          onSave={handleMetadataSaved}
        />
      </ModalCommon>
    </>
  );
};

export default BuildNcnModal;
