import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useKaraokeStore } from "../../stores/karaoke-store";
import { readMp3 } from "../mp3-klyr-parser/read";
import CommonPlayerStyle from "@/components/common/player";

type Props = {
  src: string | null;
};

export type AudioPlayerRef = {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
};

const AudioPlayer = forwardRef<AudioPlayerRef, Props>(({ src }, ref) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { loadAudioFile, setIsPlaying: setGlobalIsPlaying } = useKaraokeStore(
    (state) => state.actions
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useImperativeHandle(ref, () => ({
    play: () => audioRef.current?.play(),
    pause: () => audioRef.current?.pause(),
    seek: (time: number) => {
      if (audioRef.current) audioRef.current.currentTime = time;
    },
    getCurrentTime: () => audioRef.current?.currentTime ?? 0,
    isPlaying: () => !!audioRef.current && !audioRef.current.paused,
  }));

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      setIsPlaying(true);
      setGlobalIsPlaying(true);
    };
    const handlePause = () => {
      setIsPlaying(false);
      setGlobalIsPlaying(false);
    };
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handlePause);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handlePause);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
    };
  }, [setGlobalIsPlaying]);

  useEffect(() => {
    if (src && audioRef.current) {
      audioRef.current.src = src;
      audioRef.current.load();
    }
  }, [src]);

  const onUploadFile = async (file?: File) => {
    if (!file) return;
    try {
      const { parsedData } = await readMp3(file);
      const audioUrl = URL.createObjectURL(file);
      setFileName(file.name);

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

  const handlePlayPause = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const handleSeek = (value: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
    }
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={src ?? undefined}
        className="hidden"
        preload="auto"
      />
      <CommonPlayerStyle
        fileName={fileName}
        isPlaying={isPlaying}
        onFileChange={onUploadFile}
        onPlayPause={handlePlayPause}
        onStop={handleStop}
        onSeek={handleSeek}
        duration={duration}
        currentTime={currentTime}
      />
    </>
  );
});

AudioPlayer.displayName = "AudioPlayer";
export default AudioPlayer;
