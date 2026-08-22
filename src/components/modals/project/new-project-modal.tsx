import { FileMusic, Piano } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import ModalCommon from "@/components/common/modal";
import SelectCommon from "@/components/common/data-input/select";
import Upload from "@/components/common/data-input/upload";
import MetadataForm from "@/components/metadata/metadata-form";
import { MusicMode } from "@/types/common.type";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { useUiStore } from "@/features/ui/ui-store";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import { createProject, getProject, ProjectData } from "@/lib/database/db";
import { convertParsedDataForImport } from "@/stores/karaoke-store/utils";
import { groupLyricsByLine } from "@/lib/karaoke/lyrics/convert";
import { parseMidi } from "@/lib/karaoke/midi/reader";
import { SongInfo, DEFAULT_SONG_INFO } from "@/lib/karaoke/midi/types";
import { readMp3 } from "@/lib/karaoke/mp3/read";
import { getMissingRequiredSongInfo } from "@/lib/karaoke/metadata-validation";
import {
  DEFAULT_SOUNDFONT_ENTRY,
  DEFAULT_SOUNDFONT_ID,
} from "@/lib/soundfonts";

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({ open, onClose }) => {
  const [projectMode, setProjectMode] = useState<MusicMode>("midi");
  const [musicFile, setMusicFile] = useState<File>();
  const [youtubeUrl, setYoutubeUrl] = useState<string>();
  const [metadata, setMetadataState] = useState<SongInfo>(DEFAULT_SONG_INFO);
  const metadataRef = useRef<SongInfo>(DEFAULT_SONG_INFO);
  const [showMetadataErrors, setShowMetadataErrors] = useState(false);

  const updateMetadata = (next: SongInfo) => {
    metadataRef.current = next;
    setMetadataState(next);
  };

  const loadProject = useKaraokeStore((state) => state.actions.loadProject);
  const requestAlert = useUiStore((state) => state.requestAlert);
  const locale = useSettingsStore((state) => state.uiLocale);

  const getYouTubeId = (url: string): string | null => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const handleFileSelect = async (files: File[]) => {
    const file = files[0];
    if (!file) {
      setMusicFile(undefined);
      return;
    }
    setMusicFile(file);

    try {
      let readInfo: any = {};

      if (projectMode === "midi") {
        const parsedMidi = await parseMidi(file);
        readInfo = parsedMidi.info;
      } else if (projectMode === "mp3") {
        const { parsedData: parsedMp3 } = await readMp3(file);
        readInfo = {
          ...parsedMp3.info,
          TITLE: parsedMp3.title,
          ARTIST: parsedMp3.artist,
          ALBUM: parsedMp3.album,
        };
      }
      if (!readInfo.TITLE) {
        readInfo.TITLE = file.name.replace(/\.[^/.]+$/, "");
      }

      updateMetadata({ ...DEFAULT_SONG_INFO, ...readInfo });
    } catch (error) {
      console.error("Error reading metadata from file:", error);
    }
  };

  const handleCreateProject = async () => {
    if (projectMode !== "youtube" && !musicFile) {
      await requestAlert({
        title: text(locale, "ยังไม่ได้เลือกไฟล์เพลง", "No song file selected"),
        description: text(
          locale,
          "กรุณาเลือกไฟล์เพลงก่อนสร้างโปรเจกต์",
          "Choose a song file before creating the project"
        ),
        tone: "info",
      });
      return;
    }
    if (projectMode === "youtube" && !youtubeUrl?.trim()) {
      await requestAlert({
        title: text(locale, "ยังไม่ได้ใส่ URL", "URL is missing"),
        description: text(
          locale,
          "กรุณาใส่ YouTube URL ก่อนสร้างโปรเจกต์",
          "Enter a YouTube URL before creating the project"
        ),
        tone: "info",
      });
      return;
    }
    const currentMetadata = metadataRef.current;
    const missingMetadata = getMissingRequiredSongInfo(currentMetadata);

    if (missingMetadata.length > 0) {
      setShowMetadataErrors(true);
      return;
    }
    setShowMetadataErrors(false);

    try {
      let initialData: ProjectData = {
        playerState: {
          midi: null,
          storedFile: null,
          duration: null,
          youtubeId: null,
        },
        metadata: currentMetadata,
        lyricsData: [],
        lyricsDocument: null,
        lyricsXml: "",
        chordsData: [],
        soundfonts: [DEFAULT_SOUNDFONT_ENTRY],
        activeSoundfontId: DEFAULT_SOUNDFONT_ID,
      };

      if (musicFile) {
        switch (projectMode) {
          case "midi": {
            const parsedMidi = await parseMidi(musicFile);
            initialData.playerState.midi = parsedMidi;
            initialData.playerState.duration = parsedMidi.duration;
            initialData.metadata = {
              ...DEFAULT_SONG_INFO,
              ...parsedMidi.info,
              ...currentMetadata,
            };

            const {
              finalWords: midiWords,
              convertedChords: midiChords,
              lyricsDocument,
              lyricsXml,
            } = convertParsedDataForImport(
              parsedMidi,
              true,
              parsedMidi.ticksPerBeat,
              parsedMidi.tempos
            );
            initialData.lyricsData = groupLyricsByLine(midiWords);
            initialData.lyricsDocument = lyricsDocument;
            initialData.lyricsXml = lyricsXml;
            initialData.chordsData = midiChords;
            break;
          }

          case "mp3": {
            const { parsedData } = await readMp3(musicFile);
            initialData.playerState.duration = parsedData.duration ?? null;
            initialData.metadata = {
              ...DEFAULT_SONG_INFO,
              ...parsedData.info,
              ...currentMetadata,
            };

            const {
              finalWords: mp3Words,
              convertedChords: mp3Chords,
              lyricsDocument,
              lyricsXml,
            } = convertParsedDataForImport(parsedData, false, 0);

            initialData.lyricsData = groupLyricsByLine(mp3Words);
            initialData.lyricsDocument = lyricsDocument;
            initialData.lyricsXml = lyricsXml;
            initialData.chordsData = mp3Chords;
            break;
          }
        }
      } else if (projectMode === "youtube" && youtubeUrl) {
        const videoId = getYouTubeId(youtubeUrl);
        if (!videoId) {
          await requestAlert({
            title: text(locale, "YouTube URL ไม่ถูกต้อง", "Invalid YouTube URL"),
            description: text(
              locale,
              "กรุณาตรวจสอบ URL แล้วลองใหม่อีกครั้ง",
              "Check the URL and try again"
            ),
            tone: "danger",
          });
          return;
        }
        initialData.playerState.youtubeId = videoId;
      }

      const newProjectId = await createProject(
        currentMetadata.TITLE,
        projectMode,
        initialData,
        musicFile
      );

      const newProject = await getProject(newProjectId);
      if (newProject) {
        loadProject(newProject);
        window.location.href = `/project/${newProject.id}`;
      }
      onClose();
    } catch (error) {
      console.error("Failed to create project:", error);
      await requestAlert({
        title: text(locale, "สร้างโปรเจกต์ไม่สำเร็จ", "Could not create project"),
        description: text(
          locale,
          "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
          "Something went wrong. Please try again"
        ),
        tone: "danger",
      });
    }
  };

  const getAcceptType = () => {
    switch (projectMode) {
      case "midi":
        return ".mid,.midi";
      case "mp3":
        return "";
      default:
        return "";
    }
  };

  const onProjectTypeChange = (value: MusicMode) => {
    setProjectMode(value);
    updateMetadata(DEFAULT_SONG_INFO);
    setShowMetadataErrors(false);
    setMusicFile(undefined);
    setYoutubeUrl(undefined);
  };

  useEffect(() => {
    updateMetadata(DEFAULT_SONG_INFO);
    setShowMetadataErrors(false);
  }, [open]);

  const disabled = projectMode === "youtube" ? !youtubeUrl : !musicFile;
  const requiredErrors: Partial<Record<keyof SongInfo, string>> = {};
  if (showMetadataErrors) {
    for (const key of getMissingRequiredSongInfo(metadata)) {
      requiredErrors[key] = text(locale, "จำเป็นต้องกรอก", "Required");
    }
  }

  return (
    <ModalCommon
      title={text(locale, "สร้าง Project ใหม่", "Create New Project")}
      open={open}
      onClose={onClose}
      modalClassName="flex flex-col"
      okButtonProps={{
        onClick: handleCreateProject,
        disabled,
        children: text(locale, "สร้าง Project", "Create Project"),
      }}
      cancelButtonProps={{
        onClick: onClose,
        disabled,
        children: text(locale, "ยกเลิก", "Cancel"),
      }}
    >
      <div className="flex min-h-0 flex-col gap-4">
        <SelectCommon
          label={text(locale, "รูปแบบ Project", "Project Mode")}
          options={[
            { label: "MIDI (.mid)", value: "midi" },
            { label: "MP3 (.mp3)", value: "mp3" },
          ]}
          value={projectMode}
          onChange={(e) => onProjectTypeChange(e.target.value as MusicMode)}
        />

        <Upload
          accept={getAcceptType()}
          preview={true}
          icon={
            projectMode === "midi" ? (
              <Piano className="text-4xl text-amber-500" />
            ) : (
              <FileMusic className="text-4xl text-primary" />
            )
          }
          onChange={handleFileSelect}
        />

        <div className="">
          <MetadataForm
            card={false}
            requiredFirst
            className="flex flex-col gap-3"
            inputSize="md"
            adding
            disabled={disabled}
            onFieldChange={(data) => {
              updateMetadata({ ...DEFAULT_SONG_INFO, ...data });
            }}
            initMetadata={metadata}
            requiredErrors={requiredErrors}
          />
        </div>
      </div>
    </ModalCommon>
  );
};

export default NewProjectModal;
