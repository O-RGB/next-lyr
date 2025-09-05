import React, { useEffect, useState } from "react";
import ModalCommon from "@/components/common/modal";
import SelectCommon from "@/components/common/data-input/select";
import Upload from "@/components/common/data-input/upload";
import MetadataForm from "@/components/metadata/metadata-form";
import InputCommon from "@/components/common/data-input/input";
import { MusicMode } from "@/types/common.type";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { createProject, getProject, ProjectData } from "@/lib/database/db";
import { readMp3 } from "@/modules/mp3-klyr-parser/read";
import { JsSynthEngine } from "@/modules/js-synth/lib/js-synth-engine";
import {
  DEFAULT_SONG_INFO,
  SongInfo,
} from "@/modules/midi-klyr-parser/lib/processor";
import { loadMidiFile } from "@/modules/midi-klyr-parser/lib/processor";
import { convertParsedDataForImport } from "@/stores/karaoke-store/utils";
import { groupLyricsByLine } from "@/lib/karaoke/lyrics/convert";

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({ open, onClose }) => {
  const [projectMode, setProjectMode] = useState<MusicMode>("midi");
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [metadata, setMetadataTemp] = useState<SongInfo>();

  const loadProject = useKaraokeStore((state) => state.actions.loadProject);

  const getYouTubeId = (url: string): string | null => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const handleFileSelect = async (files: File[]) => {
    const file = files[0];
    if (!file) {
      setMusicFile(null);
      return;
    }
    setMusicFile(file);

    try {
      let readInfo: any = {};

      if (projectMode === "midi") {
        const parsedMidi = await loadMidiFile(file);
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

      console.log("readInfo", readInfo);
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
      alert("Metadata has not been initialized.");
      return;
    }

    if (projectMode !== "youtube" && !musicFile) {
      alert("Please select a music file.");
      return;
    }
    if (projectMode === "youtube" && !youtubeUrl.trim()) {
      alert("Please enter a YouTube URL.");
      return;
    }
    if (!metadata.TITLE?.trim()) {
      alert("Please enter a project name (song title).");
      return;
    }

    try {
      let initialData: ProjectData = {
        playerState: {
          midiInfo: null,
          storedFile: null,
          duration: null,
          youtubeId: null,
        },
        metadata: metadata,
        lyricsData: [],
        chordsData: [],
      };

      if (musicFile) {
        switch (projectMode) {
          case "midi":
            const parsedMidi = await loadMidiFile(musicFile);
            const engine = new JsSynthEngine();
            await engine.startup();
            if (engine.player) {
              const midiInfo = await engine.player.loadMidi(musicFile);
              initialData.playerState.midiInfo = {
                fileName: musicFile.name,
                durationTicks: midiInfo.durationTicks,
                ppq: midiInfo.ppq,
                bpm: midiInfo.bpm,
                raw: parsedMidi,
              };
              initialData.playerState.duration = midiInfo.durationTicks;
            }
            setMetadataTemp(parsedMidi.info);
            initialData.metadata = parsedMidi.info;
            const { finalWords: midiWords, convertedChords: midiChords } =
              convertParsedDataForImport(
                parsedMidi,
                true,
                parsedMidi.midiData.ticksPerBeat
              );
            initialData.lyricsData = groupLyricsByLine(midiWords);
            initialData.chordsData = midiChords;
            break;

          case "mp3":
            const { parsedData } = await readMp3(musicFile);
            initialData.metadata = {
              ...DEFAULT_SONG_INFO,
              ...parsedData.info,
              TITLE: parsedData.title || metadata.TITLE,
              ARTIST: parsedData.artist,
              ALBUM: parsedData.album,
            };
            const { finalWords: mp3Words, convertedChords: mp3Chords } =
              convertParsedDataForImport(parsedData, false);
            initialData.lyricsData = groupLyricsByLine(mp3Words);
            initialData.chordsData = mp3Chords;
            break;
        }
      } else if (projectMode === "youtube") {
        const videoId = getYouTubeId(youtubeUrl);
        if (!videoId) {
          alert("Invalid YouTube URL.");
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
      alert("Could not create the project. Please try again.");
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

  useEffect(() => {
    setMetadataTemp(DEFAULT_SONG_INFO);
  }, [open]);

  return (
    <ModalCommon
      title="Create New Project"
      open={open}
      onClose={onClose}
      okButtonProps={{
        onClick: handleCreateProject,
      }}
      cancelButtonProps={{
        onClick: onClose,
      }}
    >
      <div className="flex flex-col gap-4">
        <SelectCommon
          label="Project Mode"
          options={[
            { label: "MIDI (.mid)", value: "midi" },
            { label: "MP3 (.mp3)", value: "mp3" },
            { label: "MP4 (.mp4)", value: "mp4" },
            { label: "YouTube", value: "youtube" },
          ]}
          value={projectMode}
          onChange={(e) => setProjectMode(e.target.value as MusicMode)}
        />

        {projectMode !== "youtube" ? (
          <Upload
            accept={getAcceptType()}
            preview={true}
            onChange={handleFileSelect}
          />
        ) : (
          <InputCommon
            label="YouTube URL"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="Enter the YouTube video URL"
          />
        )}

        <div className="">
          <MetadataForm
            className="flex flex-col gap-4"
            inputSize={"md"}
            adding
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
