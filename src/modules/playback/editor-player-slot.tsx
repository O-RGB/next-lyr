"use client";

import { useState } from "react";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { usePlayerSetup } from "@/hooks/usePlayerSetup";
import PlayerHost from "@/modules/player";

export function EditorPlayerSlot({ preview }: { preview: boolean }) {
  const projectId = useKaraokeStore((state) => state.projectId);
  const mode = useKaraokeStore((state) => state.mode);
  const storedFile = useKaraokeStore((state) => state.playerState.storedFile);
  const duration = useKaraokeStore((state) => state.playerState.duration);
  const playerKey = `${projectId ?? "none"}:${mode ?? "none"}:${
    storedFile?.file?.name ?? "none"
  }`;

  return (
    <EditorPlayerRuntime
      key={playerKey}
      projectId={projectId}
      mode={mode}
      storedFile={storedFile}
      duration={duration}
      preview={preview}
    />
  );
}

function EditorPlayerRuntime({
  projectId,
  mode,
  storedFile,
  duration,
  preview,
}: {
  projectId: ReturnType<typeof useKaraokeStore.getState>["projectId"];
  mode: ReturnType<typeof useKaraokeStore.getState>["mode"];
  storedFile: ReturnType<typeof useKaraokeStore.getState>["playerState"]["storedFile"];
  duration: number | null;
  preview: boolean;
}) {
  const [ready, setReady] = useState(false);
  const { playerRef } = usePlayerSetup(
    projectId,
    storedFile,
    mode,
    duration,
    ready
  );

  return (
    <div
      className={`w-full transition-all ${
        preview ? "top-[203px]" : "top-20"
      } lg:static lg:w-auto`}
    >
      <PlayerHost
        ref={playerRef}
        containerClassName="w-full !h-[100px] lg:!h-auto lg:aspect-video"
        onReady={() => setReady(true)}
      />
    </div>
  );
}
