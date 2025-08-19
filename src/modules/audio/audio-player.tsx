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
    console.log("AudioPlayer: Rendering with props:", { src, file, onReady });
    const audioRef = useRef<HTMLAudioElement>(null);
    const { loadAudioFile, setIsPlaying: setGlobalIsPlaying } = useKaraokeStore(
      (state) => state.actions
    );
    const [isPlaying, setIsPlaying] = useState(false);
    const [fileName, setFileName] = useState("");
    const [duration, setDuration] = useState(0);

    const currentTime = useKaraokeStore((state) => state.currentTime);
    console.log("AudioPlayer: Initial state:", {
      isPlaying,
      fileName,
      duration,
      currentTime,
    });

    useImperativeHandle(ref, () => {
      console.log("AudioPlayer: useImperativeHandle creating refs");
      return {
        play: () => {
          console.log("AudioPlayer: play() called via ref");
          audioRef.current?.play();
        },
        pause: () => {
          console.log("AudioPlayer: pause() called via ref");
          audioRef.current?.pause();
        },
        seek: (time: number) => {
          console.log(`AudioPlayer: seek(${time}) called via ref`);
          if (audioRef.current) {
            audioRef.current.currentTime = time;
            timerControls.seekTimer(time);
          }
        },
        getCurrentTime: () => {
          const time = audioRef.current?.currentTime ?? 0;
          console.log(
            `AudioPlayer: getCurrentTime() called via ref, returning ${time}`
          );
          return time;
        },
        isPlaying: () => {
          const playing = !!audioRef.current && !audioRef.current.paused;
          console.log(
            `AudioPlayer: isPlaying() called via ref, returning ${playing}`
          );
          return playing;
        },
      };
    });

    useEffect(() => {
      console.log("AudioPlayer: useEffect [file] triggered.");
      if (file) {
        console.log("AudioPlayer: Setting filename from file prop:", file.name);
        setFileName(file.name);
      }
    }, [file]);

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) {
        console.log(
          "AudioPlayer: useEffect for event listeners skipped, audio ref not ready."
        );
        return;
      }
      console.log(
        "AudioPlayer: useEffect for event listeners running. Attaching listeners."
      );

      const handlePlay = () => {
        console.log("AudioPlayer: 'play' event triggered.");
        setIsPlaying(true);
        setGlobalIsPlaying(true);
        timerControls.startTimer();
      };
      const handlePause = () => {
        console.log("AudioPlayer: 'pause' or 'ended' event triggered.");
        setIsPlaying(false);
        setGlobalIsPlaying(false);
        timerControls.stopTimer();
      };
      const handleDurationChange = () => {
        console.log(
          `AudioPlayer: 'durationchange' event. New duration: ${audio.duration}`
        );
        setDuration(audio.duration);
      };

      audio.addEventListener("play", handlePlay);
      audio.addEventListener("pause", handlePause);
      audio.addEventListener("ended", handlePause);
      audio.addEventListener("durationchange", handleDurationChange);

      return () => {
        console.log(
          "AudioPlayer: useEffect cleanup. Removing event listeners."
        );
        audio.removeEventListener("play", handlePlay);
        audio.removeEventListener("pause", handlePause);
        audio.removeEventListener("ended", handlePause);
        audio.removeEventListener("durationchange", handleDurationChange);
      };
    }, [setGlobalIsPlaying, timerControls]);

    useEffect(() => {
      console.log("AudioPlayer: useEffect [src] triggered with src:", src);
      if (src && audioRef.current) {
        console.log(
          "AudioPlayer: Setting new src on audio element and loading."
        );
        audioRef.current.src = src;
        audioRef.current.load();
      }
    }, [src]);

    const onUploadFile = async (file?: File) => {
      console.log("AudioPlayer: onUploadFile called with file:", file);
      if (!file) return;
      try {
        console.log("AudioPlayer: Reading MP3 file...");
        const { parsedData } = await readMp3(file);
        const audioUrl = URL.createObjectURL(file);
        console.log("AudioPlayer: MP3 read successfully.", {
          parsedData,
          audioUrl,
        });
        setFileName(file.name);

        const tempAudio = document.createElement("audio");
        tempAudio.src = audioUrl;

        const handleMetadata = () => {
          console.log(
            "AudioPlayer: 'loadedmetadata' event on temp audio. Duration:",
            tempAudio.duration
          );
          loadAudioFile(audioUrl, file, parsedData, tempAudio.duration);
          timerControls.resetTimer();
          tempAudio.removeEventListener("loadedmetadata", handleMetadata);
          console.log(
            "AudioPlayer: Audio data loaded to store and timer reset."
          );
        };

        tempAudio.addEventListener("loadedmetadata", handleMetadata);
      } catch (error) {
        console.error("Error processing MP3 file:", error);
        alert("Failed to process MP3 file. It might be invalid or corrupted.");
      }
    };

    const handlePlayPause = () => {
      console.log("AudioPlayer: handlePlayPause called. isPlaying:", isPlaying);
      if (isPlaying) {
        audioRef.current?.pause();
      } else {
        audioRef.current?.play();
      }
    };

    const handleStop = () => {
      console.log("AudioPlayer: handleStop called.");
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        timerControls.seekTimer(0);
        console.log("AudioPlayer: Player stopped and seeked to 0.");
      }
    };

    const handleSeek = (value: number) => {
      console.log(`AudioPlayer: handleSeek called with value: ${value}`);
      if (audioRef.current) {
        audioRef.current.currentTime = value;
        timerControls.seekTimer(value);
      }
    };

    console.log("AudioPlayer: Rendering CommonPlayerStyle and audio element.");
    return (
      <>
        <audio
          ref={audioRef}
          src={src ?? undefined}
          className="hidden"
          preload="auto"
          onLoadedData={() => {
            console.log("AudioPlayer: 'onLoadedData' event triggered.");
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
