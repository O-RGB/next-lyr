import {
  PlayerControls,
  useKeyboardControls,
} from "@/hooks/useKeyboardControls";
import { usePlaybackSync } from "@/hooks/usePlaybackSync";
import { MidiPlayerRef } from "@/modules/js-synth/player";
import { VideoPlayerRef } from "@/modules/video/video-player";
import { YouTubePlayerRef } from "@/modules/youtube/youtube-player";
import React, { RefObject } from "react";

interface KeyboardRenderProps {
  playerControls: PlayerControls | null;
  audioRef: RefObject<HTMLAudioElement | null>;
  videoRef: RefObject<VideoPlayerRef | null>;
  youtubeRef: RefObject<YouTubePlayerRef | null>;
  midiPlayerRef: RefObject<MidiPlayerRef | null>;
  handleEditLine: (lineIndex: number) => void;
}

const KeyboardRender: React.FC<KeyboardRenderProps> = ({
  playerControls,
  audioRef,
  midiPlayerRef,
  videoRef,
  youtubeRef,
  handleEditLine,
}) => {
  useKeyboardControls(playerControls, handleEditLine);
  usePlaybackSync(audioRef, videoRef, youtubeRef, midiPlayerRef);
  return <></>;
};

export default KeyboardRender;
