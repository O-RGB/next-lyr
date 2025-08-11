// src/components/modals/project/new-project-modal.tsx
import React, { useState } from "react";
import ModalCommon from "@/components/common/modal";
import InputCommon from "@/components/common/data-input/input";
import SelectCommon from "@/components/common/data-input/select";
import ButtonCommon from "@/components/common/button";
import { MusicMode } from "@/types/common.type";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { DEFAULT_SONG_INFO } from "@/modules/midi-klyr-parser/lib/processor";
import { createProject, getProject, ProjectData } from "@/lib/database/db"; // <<< Thêm ProjectData

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({
  open,
  onClose,
  onProjectCreated,
}) => {
  const [projectName, setProjectName] = useState("");
  const [projectMode, setProjectMode] = useState<MusicMode>("midi");
  const { loadProject } = useKaraokeStore((state) => state.actions);

  const modeOptions = [
    { label: "MIDI (.mid)", value: "midi" },
    { label: "MP3 (.mp3)", value: "mp3" },
    { label: "MP4 (.mp4)", value: "mp4" },
    { label: "YouTube", value: "youtube" },
  ];

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      alert("Vui lòng nhập tên dự án.");
      return;
    }

    try {
      // <<< Sửa đổi: Cập nhật cấu trúc dữ liệu ban đầu để phù hợp với schema mới
      const initialData: ProjectData = {
        playerState: {
          midiInfo: null,
          storedFile: null, // Thay đổi rawFile, audioSrc, videoSrc thành storedFile
          youtubeId: null,
          duration: null,
        },
        metadata: { ...DEFAULT_SONG_INFO, TITLE: projectName },
        lyricsData: [],
        chordsData: [],
        currentTime: 0,
        selectedLineIndex: null,
        chordPanelCenterTick: 0,
        isChordPanelAutoScrolling: true,
      };

      const newProjectId = await createProject(
        projectName,
        projectMode,
        initialData
      );

      const newProject = await getProject(newProjectId);
      if (newProject) {
        loadProject(newProject);
      }

      setProjectName("");
      setProjectMode("midi");
      onProjectCreated();
    } catch (error) {
      alert("Không thể tạo dự án.");
    }
  };

  return (
    <ModalCommon
      title="Tạo dự án mới"
      open={open}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <ButtonCommon color="gray" onClick={onClose}>
            Hủy bỏ
          </ButtonCommon>
          <ButtonCommon onClick={handleCreateProject}>Tạo</ButtonCommon>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <InputCommon
          label="Tên dự án"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Nhập tên cho dự án của bạn"
        />
        <SelectCommon
          label="Chế độ dự án"
          options={modeOptions}
          value={projectMode}
          onChange={(e) => setProjectMode(e.target.value as MusicMode)}
        />
      </div>
    </ModalCommon>
  );
};

export default NewProjectModal;
