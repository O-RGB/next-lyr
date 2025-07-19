import type { Dispatch, SetStateAction, RefObject } from "react";
import AudioPlayer from "./audio-player";
import MetadataForm from "./metadata-form";

type Props = {
  audioRef: RefObject<HTMLAudioElement | null>;
  audioSrc: string | null;
  metadata: { title: string; artist: string };
  onAudioLoad: (file: File) => void;
  onMetadataChange: Dispatch<SetStateAction<{ title: string; artist: string }>>;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
};

export default function ControlPanel({ ...props }: Props) {
  return (
    <>
      <AudioPlayer
        audioRef={props.audioRef}
        src={props.audioSrc}
        onFileChange={props.onAudioLoad}
        onPlay={props.onPlay}
        onPause={props.onPause}
        onStop={props.onStop}
      />
      <MetadataForm
        metadata={props.metadata}
        onMetadataChange={props.onMetadataChange}
      />
    </>
  );
}
