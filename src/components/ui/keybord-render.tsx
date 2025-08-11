import {
  PlayerControls,
  useKeyboardControls,
} from "@/hooks/useKeyboardControls";
import { usePlaybackSync } from "@/hooks/usePlaybackSync";
import React from "react";

interface KeyboardRenderProps {
  playerControls: PlayerControls | null;
  handleEditLine: (lineIndex: number) => void;
}

const KeyboardRender: React.FC<KeyboardRenderProps> = ({
  playerControls,
  handleEditLine,
}) => {
  useKeyboardControls(playerControls, handleEditLine);
  usePlaybackSync(playerControls);
  return <></>;
};

export default KeyboardRender;
