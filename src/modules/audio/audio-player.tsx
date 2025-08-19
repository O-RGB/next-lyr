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
import { TimerControls } from "@/components/ui/player-host";

type Props = {
  src: string | null;
  file?: File | null;
  onReady?: () => void;
  timerControls: TimerControls;
};

export type AudioPlayerRef = {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
};

const AudioPlayer = forwardRef<AudioPlayerRef, Props>(
  ({ src, file, onReady, timerControls }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const { loadAudioFile, setIsPlaying: setGlobalIsPlaying } = useKaraokeStore(
      (state) => state.actions
    );
    const [isPlaying, setIsPlaying] = useState(false);
    const [fileName, setFileName] = useState("");
    const [duration, setDuration] = useState(0);

    const currentTime = useKaraokeStore((state) => state.currentTime);

    useImperativeHandle(ref, () => {
      return {
        play: () => {
          audioRef.current?.play();
        },
        pause: () => {
          audioRef.current?.pause();
        },
        seek: (time: number) => {
          if (audioRef.current) {
            audioRef.current.currentTime = time;
            timerControls.seekTimer(time);
          }
        },
        getCurrentTime: () => {
          const time = audioRef.current?.currentTime ?? 0;
          return time;
        },
        isPlaying: () => {
          const playing = !!audioRef.current && !audioRef.current.paused;

          return playing;
        },
      };
    });

    useEffect(() => {
      if (file) {
        setFileName(file.name);
      }
    }, [file]);

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) {
        return;
      }

      const handlePlay = () => {
        setIsPlaying(true);
        setGlobalIsPlaying(true);
        timerControls.startTimer();
      };
      const handlePause = () => {
        setIsPlaying(false);
        setGlobalIsPlaying(false);
        timerControls.stopTimer();
      };
      const handleDurationChange = () => {
        setDuration(audio.duration);
      };

      audio.addEventListener("play", handlePlay);
      audio.addEventListener("pause", handlePause);
      audio.addEventListener("ended", handlePause);
      audio.addEventListener("durationchange", handleDurationChange);

      return () => {
        audio.removeEventListener("play", handlePlay);
        audio.removeEventListener("pause", handlePause);
        audio.removeEventListener("ended", handlePause);
        audio.removeEventListener("durationchange", handleDurationChange);
      };
    }, [setGlobalIsPlaying, timerControls]);

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
          timerControls.resetTimer();
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
        timerControls.seekTimer(0);
      }
    };

    const handleSeek = (value: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = value;
        timerControls.seekTimer(value);
      }
    };

    return (
      <>
        <audio
          ref={audioRef}
          src={src ?? undefined}
          className="hidden"
          preload="auto"
          onLoadedData={() => {
            onReady?.();
          }}
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
  }
);

AudioPlayer.displayName = "AudioPlayer";
export default AudioPlayer;
