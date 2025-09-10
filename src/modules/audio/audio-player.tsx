import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useKaraokeStore } from "../../stores/karaoke-store";
import CommonPlayerStyle from "@/components/common/player";
import { readMp3 } from "@/lib/karaoke/mp3/read";
import { useTimerStore } from "@/hooks/useTimerWorker";

type Props = {
  src: string | null;
  file?: File | null;
  onReady?: () => void;
};

export type AudioPlayerRef = {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
};

const AudioPlayer = forwardRef<AudioPlayerRef, Props>(
  ({ src, file, onReady }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const { loadAudioFile, setIsPlaying: setGlobalIsPlaying } = useKaraokeStore(
      (state) => state.actions
    );
    const timerControls = useTimerStore();
    const [isPlaying, setIsPlaying] = useState(false);
    const [fileName, setFileName] = useState("");
    const [duration, setDuration] = useState(0);

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
        getCurrentTime: () => useKaraokeStore.getState().currentTime,
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
    }, [setGlobalIsPlaying]);

    useEffect(() => {
      timerControls.initWorker();
      timerControls.updateMode("time");
      return () => timerControls.terminateWorker();
    }, [timerControls.initWorker, timerControls.terminateWorker]);

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

    useEffect(() => {
      if (file && audioRef) {
        onUploadFile(file);
      }
    }, [file, audioRef]);

    return (
      <>
        <audio
          ref={audioRef}
          src={src ?? undefined}
          className="hidden"
          preload="auto"
          onLoadedData={() => {
            setTimeout(() => onReady?.(), 100);
          }}
        />
        <CommonPlayerStyle
          fileName={fileName}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onStop={handleStop}
          onSeek={handleSeek}
          duration={duration}
        />
      </>
    );
  }
);

AudioPlayer.displayName = "AudioPlayer";
export default AudioPlayer;
