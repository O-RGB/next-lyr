"use client";

import { useKeyboardControls } from "@/hooks/useKeyboardControls";
import { usePlaybackSync } from "@/hooks/usePlaybackSync";
import { usePlayerSetupStore } from "@/hooks/usePlayerSetup";

export function LyricsEditorRuntime() {
  const playerControls = usePlayerSetupStore((state) => state.playerControls);
  useKeyboardControls(playerControls);
  usePlaybackSync(playerControls);
  return null;
}
