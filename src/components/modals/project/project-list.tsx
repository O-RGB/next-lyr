import ModalCommon from "@/components/common/modal";
import React, { useEffect, useState } from "react";
import ButtonCommon from "@/components/common/button";
import { BiPlus, BiTrash, BiMusic } from "react-icons/bi";
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
        cancelButtonProps={{ hidden: true }}
        okButtonProps={{
          icon: <BiPlus />,
          onClick: () => setIsNewProjectModalOpen(true),
          children: "New Project",
        }}
      >
        <div>
          {projects.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleSelectProject(project)}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {/* Project Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <FaMusic className="text-purple-600 text-lg" />
                      </div>
                    </div>

                    {/* Project Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {project.name}
                        </h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 uppercase">
                          {project.mode}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Updated:{" "}
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 ml-4">
                    <div className="">
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
                        className="hover:bg-red-50"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BiMusic className="text-gray-400 text-2xl" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No projects yet
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Create your first karaoke project to get started
              </p>
              <ButtonCommon
                icon={<BiPlus />}
                onClick={() => setIsNewProjectModalOpen(true)}
                className="mx-auto"
              >
                Create Project
              </ButtonCommon>
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
