import { Music, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ModalCommon from "@/components/common/modal";
import React, { useEffect, useState } from "react";
import ButtonCommon from "@/components/common/button";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { useUiStore } from "@/features/ui/ui-store";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import {
  deleteProject,
  getAllProjectSummaries,
  ProjectSummary,
  upsertProjectSummary,
} from "@/lib/database/db";
import NewProjectModal from "./new-project-modal";

interface ProjectListModalProps {
  open?: boolean;
  onClose?: () => void;
}

const ProjectListModal: React.FC<ProjectListModalProps> = ({
  open = false,
  onClose = () => {},
}) => {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const clearProject = useKaraokeStore((state) => state.actions.clearProject);
  const currentProjectId = useKaraokeStore((state) => state.projectId);
  const currentProjectMode = useKaraokeStore((state) => state.mode);
  const currentProjectName = useKaraokeStore(
    (state) => state.metadata?.TITLE
  );
  const requestConfirm = useUiStore((state) => state.requestConfirm);
  const locale = useSettingsStore((state) => state.uiLocale);

  const fetchProjects = async () => {
    const allProjects = await getAllProjectSummaries();

    // A project created before the summary table was introduced can still be
    // shown when it is the project currently loaded in the editor. It will be
    // indexed the next time it is saved.
    if (
      currentProjectId &&
      currentProjectMode &&
      !allProjects.some((project) => project.id === currentProjectId)
    ) {
      const now = new Date();
      const currentSummary = {
        id: currentProjectId,
        name: currentProjectName || "Untitled project",
        mode: currentProjectMode,
        createdAt: now,
        updatedAt: now,
      } satisfies ProjectSummary;
      allProjects.unshift(currentSummary);
      await upsertProjectSummary(currentSummary);
    }

    setProjects(allProjects);
  };

  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open]);

  const handleSelectProject = (project: ProjectSummary) => {
    router.push(`/project/${project.id}`);
  };

  const handleDeleteProject = async (id: string) => {
    const confirmed = await requestConfirm({
      title: text(locale, "ลบโปรเจกต์หรือไม่?", "Delete project?"),
      description: text(
        locale,
        "โปรเจกต์นี้จะถูกลบออกจากเครื่องและไม่สามารถกู้คืนได้",
        "This project will be deleted from this device and cannot be recovered"
      ),
      tone: "danger",
      confirmLabel: text(locale, "ลบโปรเจกต์", "Delete project"),
    });
    if (!confirmed) return;

    await deleteProject(id);
    fetchProjects();
    if (useKaraokeStore.getState().projectId === id) {
      clearProject();
    }
  };

  return (
    <>
      <ModalCommon
        title={text(locale, "โปรเจกต์ของฉัน", "My Projects")}
        open={open}
        onClose={onClose}
        modalClassName="flex flex-col"
        cancelButtonProps={{ hidden: true }}
        okButtonProps={{
          icon: <Plus />,
          onClick: () => setIsNewProjectModalOpen(true),
          children: text(locale, "สร้าง Project ใหม่", "New Project"),
        }}
      >
        <div>
          {projects.length > 0 ? (
            <div className="divide-y divide-line">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group flex items-center justify-between p-4 hover:bg-panel-2 transition-colors cursor-pointer"
                  onClick={() => handleSelectProject(project)}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {/* Project Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Music className="text-primary text-lg" />
                      </div>
                    </div>

                    {/* Project Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-foreground truncate">
                          {project.name}
                        </h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-raised text-foreground uppercase">
                          {project.mode}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {text(locale, "แก้ไขล่าสุด:", "Updated:")} {" "}
                        {new Date(project.updatedAt).toLocaleDateString(
                          locale === "th" ? "th-TH" : "en-US"
                        )}
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
                        icon={<Trash2 />}
                        className="hover:bg-destructive/10"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-raised rounded-full flex items-center justify-center mx-auto mb-4">
                <Music className="text-muted-foreground text-2xl" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {text(locale, "ยังไม่มี Project", "No projects yet")}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {text(
                  locale,
                  "สร้าง Project แรกของคุณเพื่อเริ่มใช้งาน",
                  "Create your first karaoke project to get started"
                )}
              </p>
              <ButtonCommon
                icon={<Plus />}
                onClick={() => setIsNewProjectModalOpen(true)}
                className="mx-auto"
              >
                {text(locale, "สร้าง Project", "Create Project")}
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
