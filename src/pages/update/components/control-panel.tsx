import type { Dispatch, SetStateAction, RefObject } from "react";
import AudioPlayer from "./audio-player";
import { Card } from "./common/card";
import MetadataForm from "./metadata-form";

type Props = {
  audioRef: RefObject<HTMLAudioElement | null>;
  audioSrc: string | null;
  metadata: { title: string; artist: string };
  onAudioLoad: (file: File) => void;
  onMetadataChange: Dispatch<SetStateAction<{ title: string; artist: string }>>;
  onPlay: () => void; // New prop
  onPause: () => void; // New prop
  onStop: () => void; // New prop
};

export default function ControlPanel({ ...props }: Props) {
  return (
    <Card className="flex-[2] flex flex-col p-4 gap-6">
      <AudioPlayer
        audioRef={props.audioRef}
        src={props.audioSrc}
        onFileChange={props.onAudioLoad}
        onPlay={props.onPlay} // Pass new handlers
        onPause={props.onPause}
        onStop={props.onStop}
      />
      <MetadataForm
        metadata={props.metadata}
        onMetadataChange={props.onMetadataChange}
      />
    </Card>
  );
}
