import { useKeyboardControls } from "@/hooks/useKeyboardControls";
import { usePlaybackSync } from "@/hooks/usePlaybackSync";
import { usePlayerSetupStore } from "@/hooks/usePlayerSetup";
import React from "react";

interface KeyboardRenderProps {}

const KeyboardRender: React.FC<KeyboardRenderProps> = ({}) => {
  const playerControls = usePlayerSetupStore((state) => state.playerControls);
  useKeyboardControls(playerControls);
  usePlaybackSync(playerControls);
  return null;
};

export default KeyboardRender;
