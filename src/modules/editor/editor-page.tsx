"use client";

import { EditorShell } from "./components/editor-shell";
import { useEditorProject } from "./hooks/use-editor-project";

export function EditorPage({ projectId }: { projectId: string }) {
  const project = useEditorProject(projectId);

  if (project.status === "loading") {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-100">
        <div className="text-center text-gray-600">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          <p>Loading project...</p>
        </div>
      </div>
    );
  }

  if (project.status === "error") {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-100 p-6">
        <div className="max-w-md rounded-xl bg-white p-6 text-center shadow-sm">
          <div className="mb-3 text-3xl">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-800">Unable to load project</h1>
          <p className="mt-2 text-gray-600">{project.error}</p>
          <button
            type="button"
            onClick={project.reload}
            className="mt-5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <EditorShell />;
}
