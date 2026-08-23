import { useCallback, useEffect, useState } from "react";
import { getProject, upsertProjectSummary } from "@/lib/database/db";
import { useKaraokeStore } from "@/stores/karaoke-store";

type ProjectLoadState = {
  status: "loading" | "ready" | "error";
  error: string | null;
  reload: () => void;
};

export function useProjectLoader(projectId: string): ProjectLoadState {
  const loadProject = useKaraokeStore((state) => state.actions.loadProject);
  const [status, setStatus] = useState<ProjectLoadState["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!projectId.trim()) {
        setStatus("error");
        setError("Invalid project ID");
        return;
      }

      setStatus("loading");
      setError(null);

      try {
        const project = await getProject(projectId);
        if (!project) throw new Error("Project not found");
        if (cancelled) return;
        loadProject(project);
        void upsertProjectSummary({
          id: project.id,
          name: project.name,
          mode: project.mode,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        }).catch((cause) => {
          console.warn("Could not index project summary:", cause);
        });
        setStatus("ready");
      } catch (cause) {
        if (cancelled) return;
        setStatus("error");
        setError(cause instanceof Error ? cause.message : "Unable to load project");
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [loadProject, projectId, reloadToken]);

  return { status, error, reload };
}
