import type { Dispatch, SetStateAction, RefObject } from "react";
import AudioPlayer from "../../modules/audio/audio-player";
import MetadataForm from "../metadata/metadata-form";
import { SongInfo } from "@/modules/midi-klyr-parser/lib/processor";
import { MusicParseResult } from "@/modules/js-synth/player";

type Props = {
  audioRef: RefObject<HTMLAudioElement | null>;
  audioSrc: string | null;
  metadata: SongInfo | null;
  onAudioLoad: (file: File, lyricsParsed: MusicParseResult) => void;
  onMetadataChange: (metadata: Partial<SongInfo>) => void;
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
