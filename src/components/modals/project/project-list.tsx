import ModalCommon from "@/components/common/modal";
import React, { useEffect, useState } from "react";
import ButtonCommon from "@/components/common/button";
import { BiPlus, BiTrash } from "react-icons/bi";
import { FaMusic } from "react-icons/fa";
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
  const clearProject = useKaraokeStore((state) => state.actions.clearProject);

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
    window.location.href = `/project/${project.id}`;
  };

  const handleDeleteProject = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      await deleteProject(id);
      fetchProjects();
      if (useKaraokeStore.getState().projectId === id) {
        clearProject();
      }
    }
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-2">
          {projects.length > 0 ? (
            projects.map((project) => (
              <div
                key={project.id}
                className="group relative bg-gray-100 hover:bg-gray-200 rounded-lg transition-all transform hover:-translate-y-1 shadow-md hover:shadow-xl overflow-hidden"
              >
                <div
                  className="flex flex-col items-center justify-center h-48 p-4 text-center cursor-pointer"
                  onClick={() => handleSelectProject(project)}
                >
                  <FaMusic className="text-4xl text-purple-500 mb-3" />
                  <p className="font-semibold text-gray-800 break-words w-full">
                    {project.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {project.mode?.toUpperCase()}
                  </p>
                </div>
                <div className="absolute bottom-2 left-2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Updated: {new Date(project.updatedAt).toLocaleDateString()}
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ButtonCommon
                    variant="ghost"
                    color="danger"
                    size="sm"
                    circle
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id!);
                    }}
                    icon={<BiTrash />}
                  />
                </div>

                {/* <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" /> */}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500 p-8">
              <p>No projects found.</p>
              <p>Click "New Project" to get started.</p>
            </div>
          )}
        </div>
      </ModalCommon>

      <NewProjectModal
        open={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
      />
    </>
  );
};

export default ProjectListModal;
