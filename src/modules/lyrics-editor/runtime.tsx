"use client";

import { useKeyboardListener } from "@/features/keyboard/keyboard-service";
import { useSettingsBridge } from "@/features/settings/settings-bridge";
import { usePlaybackSync } from "@/hooks/usePlaybackSync";
import { usePlayerSetupStore } from "@/hooks/usePlayerSetup";
import { useTimingRecovery } from "./use-timing-recovery";

export function LyricsEditorRuntime() {
  const playerControls = usePlayerSetupStore((state) => state.playerControls);
  useKeyboardListener();
  useTimingRecovery();
  useSettingsBridge();
  usePlaybackSync(playerControls);
  return null;
}
