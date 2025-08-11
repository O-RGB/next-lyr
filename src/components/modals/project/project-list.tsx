// src/components/modals/project/project-list.tsx
import ModalCommon from "@/components/common/modal";
import React, { useEffect, useState } from "react";
import ButtonCommon from "@/components/common/button";
import { BiPlus, BiTrash } from "react-icons/bi";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { deleteProject, getAllProjects, Project } from "@/lib/database/db";
import NewProjectModal from "./new-project-modal";

interface ProjectListModalProps {
  open?: boolean;
  onClose?: () => void;
}

const ProjectListModal: React.FC<ProjectListModalProps> = ({
  open = false,
  onClose = () => {},
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const { loadProject, clearProject } = useKaraokeStore(
    (state) => state.actions
  );

  const fetchProjects = async () => {
    const allProjects = await getAllProjects();
    setProjects(allProjects);
  };

  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open]);

  const handleSelectProject = (project: Project) => {
    loadProject(project);
    onClose();
  };

  const handleDeleteProject = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      await deleteProject(id);
      fetchProjects(); // Refresh the list
      // If the deleted project is the current one, clear the state
      if (useKaraokeStore.getState().projectId === id) {
        clearProject();
      }
    }
  };

  const handleNewProjectCreated = () => {
    fetchProjects();
    setIsNewProjectModalOpen(false);
    onClose(); // ปิด modal หลักด้วย
  };

  return (
    <>
      <ModalCommon
        title="My Projects"
        open={open}
        onClose={onClose}
        footer={
          <div className="flex justify-end">
            <ButtonCommon
              icon={<BiPlus />}
              onClick={() => setIsNewProjectModalOpen(true)}
            >
              New Project
            </ButtonCommon>
          </div>
        }
      >
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
          {projects.length > 0 ? (
            projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <div
                  className="flex-grow cursor-pointer"
                  onClick={() => handleSelectProject(project)}
                >
                  <p className="font-semibold text-gray-800">{project.name}</p>
                  <p className="text-xs text-gray-500">
                    Mode: {project.mode?.toUpperCase()} | Last updated:{" "}
                    {new Date(project.updatedAt).toLocaleString()}
                  </p>
                </div>
                <ButtonCommon
                  variant="ghost"
                  color="danger"
                  size="sm"
                  circle
                  onClick={() => handleDeleteProject(project.id!)}
                  icon={<BiTrash />}
                />
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 p-8">
              <p>No projects found.</p>
              <p>Click "New Project" to get started.</p>
            </div>
          )}
        </div>
      </ModalCommon>

      <NewProjectModal
        open={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onProjectCreated={handleNewProjectCreated}
      />
    </>
  );
};

export default ProjectListModal;
