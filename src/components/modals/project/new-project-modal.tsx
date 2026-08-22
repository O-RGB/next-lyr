import { FileMusic, FileVideo, Piano } from "lucide-react";
import React, { useEffect, useState } from "react";
import ModalCommon from "@/components/common/modal";
import SelectCommon from "@/components/common/data-input/select";
import Upload from "@/components/common/data-input/upload";
import MetadataForm from "@/components/metadata/metadata-form";
import InputCommon from "@/components/common/data-input/input";
import { MusicMode } from "@/types/common.type";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { useUiStore } from "@/features/ui/ui-store";
import { createProject, getProject, ProjectData } from "@/lib/database/db";
import { convertParsedDataForImport } from "@/stores/karaoke-store/utils";
import { groupLyricsByLine } from "@/lib/karaoke/lyrics/convert";
import { parseMidi } from "@/lib/karaoke/midi/reader";
import { SongInfo, DEFAULT_SONG_INFO } from "@/lib/karaoke/midi/types";
import { readMp3 } from "@/lib/karaoke/mp3/read";
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
  const [metadata, setMetadataTemp] = useState<SongInfo>();

  const loadProject = useKaraokeStore((state) => state.actions.loadProject);
  const requestAlert = useUiStore((state) => state.requestAlert);

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

      setMetadataTemp(readInfo);
    } catch (error) {
      console.error("Error reading metadata from file:", error);
    }
  };

  const handleCreateProject = async () => {
    if (!metadata) {
      await requestAlert({
        title: "ข้อมูลเพลงยังไม่พร้อม",
        description: "ยังไม่ได้เตรียมข้อมูลเพลง",
        tone: "info",
      });
      return;
    }

    if (projectMode !== "youtube" && !musicFile) {
      await requestAlert({
        title: "ยังไม่ได้เลือกไฟล์เพลง",
        description: "กรุณาเลือกไฟล์เพลงก่อนสร้างโปรเจกต์",
        tone: "info",
      });
      return;
    }
    if (projectMode === "youtube" && youtubeUrl ? !youtubeUrl.trim() : false) {
      await requestAlert({
        title: "ยังไม่ได้ใส่ URL",
        description: "กรุณาใส่ YouTube URL ก่อนสร้างโปรเจกต์",
        tone: "info",
      });
      return;
    }
    if (!metadata.TITLE?.trim()) {
      await requestAlert({
        title: "ยังไม่ได้ตั้งชื่อโปรเจกต์",
        description: "กรุณาใส่ชื่อเพลงก่อนสร้างโปรเจกต์",
        tone: "info",
      });
      return;
    }

    try {
      let initialData: ProjectData = {
        playerState: {
          midi: null,
          storedFile: null,
          duration: null,
          youtubeId: null,
        },
        metadata: metadata,
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
            setMetadataTemp(parsedMidi.info);
            initialData.metadata = {
              ...DEFAULT_SONG_INFO,
              ...parsedMidi.info,
              ...metadata,
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
              ...metadata,
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
            title: "YouTube URL ไม่ถูกต้อง",
            description: "กรุณาตรวจสอบ URL แล้วลองใหม่อีกครั้ง",
            tone: "danger",
          });
          return;
        }
        initialData.playerState.youtubeId = videoId;
      }

      const newProjectId = await createProject(
        metadata.TITLE,
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
        title: "สร้างโปรเจกต์ไม่สำเร็จ",
        description: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
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
      case "mp4":
        return ".mp4";
      default:
        return "";
    }
  };

  const onProjectTypeChange = (value: MusicMode) => {
    setProjectMode(value);
    setMetadataTemp(DEFAULT_SONG_INFO);
    setMusicFile(undefined);
    setYoutubeUrl(undefined);
  };

  useEffect(() => {
    setMetadataTemp(DEFAULT_SONG_INFO);
  }, [open]);

  const disabled = projectMode === "youtube" ? !youtubeUrl : !musicFile;

  return (
    <ModalCommon
      title="Create New Project"
      open={open}
      onClose={onClose}
      modalClassName="flex flex-col"
      okButtonProps={{
        onClick: handleCreateProject,
        disabled,
      }}
      cancelButtonProps={{
        onClick: onClose,
        disabled,
      }}
    >
      <div className="flex min-h-0 flex-col gap-4">
        <SelectCommon
          label="Project Mode"
          options={[
            { label: "MIDI (.mid)", value: "midi" },
            { label: "MP3 (.mp3)", value: "mp3" },
            { label: "MP4 (.mp4)", value: "mp4" },
            { label: "YouTube", value: "youtube" },
          ]}
          value={projectMode}
          onChange={(e) => onProjectTypeChange(e.target.value as MusicMode)}
        />

        {projectMode !== "youtube" ? (
          <Upload
            accept={getAcceptType()}
            preview={true}
            icon={
              projectMode === "midi" ? (
                <Piano className="text-4xl text-amber-500" />
              ) : projectMode === "mp3" ? (
                <FileMusic className="text-4xl text-primary"></FileMusic>
              ) : projectMode === "mp4" ? (
                <FileVideo className="text-4xl text-primary"></FileVideo>
              ) : (
                ""
              )
            }
            onChange={handleFileSelect}
          />
        ) : (
          <InputCommon
            label="YouTube URL"
            value={youtubeUrl}
            onChange={(e) => {
              setYoutubeUrl(e.target.value);
            }}
            placeholder="Enter the YouTube video URL"
          />
        )}

        <div className="">
          <MetadataForm
            card={false}
            requiredFirst
            className="flex flex-col gap-3"
            inputSize="md"
            adding
            disabled={disabled}
            onFieldChange={(data) => {
              setMetadataTemp({ ...DEFAULT_SONG_INFO, ...data });
            }}
            initMetadata={metadata}
          />
        </div>
      </div>
    </ModalCommon>
  );
};

export default NewProjectModal;
