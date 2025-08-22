import { useKeyboardControls } from "@/hooks/useKeyboardControls";
import { usePlaybackSync } from "@/hooks/usePlaybackSync";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import { usePlayerSetupStore } from "@/hooks/usePlayerSetup";
import React from "react";

interface KeyboardRenderProps {}

const KeyboardRender: React.FC<KeyboardRenderProps> = ({}) => {
  const handleEditLine = usePlayerHandlersStore(
    (state) => state.handleEditLine
  );
  const playerControls = usePlayerSetupStore((state) => state.playerControls);
  useKeyboardControls(playerControls, handleEditLine);
  usePlaybackSync(playerControls);
  return null;
};

export default KeyboardRender;
