import { useState, useEffect, RefObject } from "react";
import { useKaraokeStore } from "../../stores/karaoke-store";
import { BsPlay, BsPause, BsStop } from "react-icons/bs";
import ButtonCommon from "../../components/common/button";
import Card from "../../components/common/card";
import { readMp3 } from "../mp3-klyr-parser/read";

type Props = {
  src: string | null;
  audioRef: RefObject<HTMLAudioElement | null>;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
};

export default function AudioPlayer({
  src,
  audioRef,
  onPlay,
  onPause,
  onStop,
}: Props) {
  const { loadAudioFile } = useKaraokeStore((state) => state.actions);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updatePlayState = () => setIsPlaying(!audio.paused);

    audio.addEventListener("play", updatePlayState);
    audio.addEventListener("pause", updatePlayState);
    audio.addEventListener("ended", updatePlayState);

    return () => {
      audio.removeEventListener("play", updatePlayState);
      audio.removeEventListener("pause", updatePlayState);
      audio.removeEventListener("ended", updatePlayState);
    };
  }, [audioRef]);

  const onUploadFile = async (file?: File) => {
    if (!file) return;
    try {
      const { parsedData } = await readMp3(file);
      const audioUrl = URL.createObjectURL(file);

      const tempAudio = document.createElement("audio");
      tempAudio.src = audioUrl;

      const handleMetadata = () => {
        loadAudioFile(audioUrl, file, parsedData, tempAudio.duration);
        tempAudio.removeEventListener("loadedmetadata", handleMetadata);
      };

      tempAudio.addEventListener("loadedmetadata", handleMetadata);
    } catch (error) {
      console.error("Error processing MP3 file:", error);
      alert("Failed to process MP3 file. It might be invalid or corrupted.");
    }
  };

  return (
    <Card className="bg-white/50 p-4 rounded-lg w-full">
      <label
        htmlFor="audio-file-input"
        className="cursor-pointer flex items-center justify-center gap-2 text-sm font-medium text-slate-600 mb-3"
      >
        Choose Audio File
      </label>
      <input
        type="file"
        id="audio-file-input"
        accept="audio/mp3, audio/mpeg"
        className="sr-only"
        onChange={(e) => e.target.files && onUploadFile(e.target.files[0])}
      />

      <audio ref={audioRef} src={src || ""} controls className="w-full" />
      <div className="flex justify-center items-center gap-2 mt-3">
        <ButtonCommon onClick={onPlay} disabled={isPlaying || !src}>
          <BsPlay className="mr-2 h-4 w-4" /> Play
        </ButtonCommon>
        <ButtonCommon onClick={onPause} disabled={!isPlaying}>
          <BsPause className="mr-2 h-4 w-4" /> Pause
        </ButtonCommon>
        <ButtonCommon onClick={onStop} disabled={!src}>
          <BsStop className="mr-2 h-4 w-4" /> Stop
        </ButtonCommon>
      </div>
    </Card>
  );
}
