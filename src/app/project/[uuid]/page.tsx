"use client";

import { ProjectPage as ProjectEditorPage } from "@/modules/project";
import { useParams } from "next/navigation";

export default function ProjectPage() {
  const params = useParams<{ uuid: string }>();

  return <ProjectEditorPage projectId={params.uuid} />;
}
