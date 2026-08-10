"use client";

import { EditorPage } from "@/modules/editor";
import { useParams } from "next/navigation";

export default function ProjectPage() {
  const params = useParams<{ uuid: string }>();

  return <EditorPage projectId={params.uuid} />;
}
