"use client";

import NavBar from "@/components/navbar";
import LyrEditerPanel from "@/components/ui/panel";
import { getProject } from "@/lib/database/db";
import { useKaraokeStore } from "@/stores/karaoke-store";
import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

export default function ProjectPage() {
  const loadProject = useKaraokeStore((state) => state.actions.loadProject);
  const projectId = useKaraokeStore((state) => state.projectId);
  const params = useParams<{ uuid: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const fetchProject = useCallback(
    async (uuid: string) => {
      try {
        setIsLoading(true);
        setError(null);

        if (!uuid || uuid.trim() === "") {
          throw new Error("Invalid project ID");
        }

        const project = await getProject(uuid);

        if (project) {
          loadProject(project);
          setHasInitialized(true);
        } else {
          throw new Error("Project not found");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        console.error("Failed to fetch project:", errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [loadProject]
  );

  useEffect(() => {
    if (!params?.uuid) {
      setIsLoading(false);
      setError("No project ID provided");
      return;
    }

    if (projectId === params.uuid && hasInitialized) {
      setIsLoading(false);
      return;
    }

    fetchProject(params.uuid);
  }, [params?.uuid, projectId, hasInitialized, fetchProject]);

  if (isLoading) {
    return (
      <div className="relative h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Error Loading Project
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => params?.uuid && fetchProject(params.uuid)}
            className="px-4 py-2 bg-violet-500 text-white rounded hover:bg-violet-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen">
      <div className="top-0 w-full bg-gradient-to-r from-violet-500 to-purple-500 z-50">
        <NavBar />
      </div>
      <LyrEditerPanel />
    </div>
  );
}
