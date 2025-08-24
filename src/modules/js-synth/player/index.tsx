import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import CommonPlayerStyle from "@/components/common/player";
import { JsSynthEngine } from "../lib/js-synth-engine";
import { JsSynthPlayerEngine } from "../lib/js-synth-player";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { useTimerStore } from "@/hooks/useTimerWorker";
import * as LyrEditer from "../../midi-klyr-parser/lib/processor";

export type MidiPlayerRef = {
  play: () => void;
  pause: () => void;
  seek: (tick: number) => void;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
};

interface MidiPlayerProps {
  file?: File | null;
  onReady?: () => void;
}

const MidiPlayer = forwardRef<MidiPlayerRef, MidiPlayerProps>(
  ({ file, onReady }, ref) => {
    const [player, setPlayer] = useState<JsSynthPlayerEngine | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [fileName, setFileName] = useState("");
    const [duration, setDuration] = useState(0);
    const timerControls = useTimerStore();

    const midiInfo = useKaraokeStore((state) => state.playerState.midiInfo);
    const { loadMidiFile, setIsPlaying: setGlobalIsPlaying } = useKaraokeStore(
      (state) => state.actions
    );

    useImperativeHandle(
      ref,
      () => ({
        play: () => {
          player?.play();
        },
        pause: () => {
          player?.pause();
        },
        seek: (tick: number) => {
          player?.seek(tick);

          if (midiInfo && midiInfo.bpm > 0 && midiInfo.ppq > 0) {
            const timeInSeconds = (tick / midiInfo.ppq) * (60 / midiInfo.bpm);
            timerControls.seekTimer(timeInSeconds);
          }
        },
        getCurrentTime: () => player?.getCurrentTime() ?? 0,
        isPlaying: () => player?.isPlaying() ?? false,
      }),
      [player, midiInfo, timerControls]
    );

    const handleFileChange = async (file: File) => {
      if (player) {
        try {
          const parsedMidi = await LyrEditer.loadMidiFile(file);
          const midiInfo = await player.loadMidi(file);
          setDuration(midiInfo.durationTicks);
          setFileName(file.name);
          
          loadMidiFile(
            {
              fileName: file.name,
              durationTicks: midiInfo.durationTicks,
              ppq: midiInfo.ppq,
              bpm: midiInfo.bpm,
              raw: parsedMidi,
            },
            parsedMidi,
            file
          );

          timerControls.resetTimer();
          setTimeout(() => {
            onReady?.();
          }, 100);
        } catch (error) {
          console.error("Error loading MIDI file:", error);
          setFileName("Error: Invalid MIDI file");
          alert("Could not load MIDI file. It may be invalid.");
        }
      }
    };

    const handlePlayPause = () => {
      if (player?.isPlaying()) {
        player?.pause();
      } else {
        player?.play();
      }
    };

    const handleStop = () => {
      player?.stop();
    };

    const handleSeek = (value: number) => {
      const currentRef = ref as React.RefObject<MidiPlayerRef>;
      currentRef.current?.seek(value);
    };

    const handleStateChange = (playing: boolean) => {
      setIsPlaying(playing);
      setGlobalIsPlaying(playing);

      if (playing) {
        if (midiInfo && midiInfo.bpm > 0 && midiInfo.ppq > 0) {
          const timeInSeconds =
            ((player?.getCurrentTime() ?? 0) / midiInfo.ppq) *
            (60 / midiInfo.bpm);
          timerControls.seekTimer(timeInSeconds);
        }
        timerControls.startTimer();
      } else {
        timerControls.stopTimer();
      }
    };

    const initialize = async () => {
      const engine = new JsSynthEngine();
      await engine.startup();
      if (engine.player) {
        setPlayer(engine.player);
      }
    };

    useEffect(() => {
      timerControls.initWorker();
      return () => timerControls.terminateWorker();
    }, [timerControls.initWorker, timerControls.terminateWorker]);

    useEffect(() => {
      initialize();
    }, []);

    useEffect(() => {
      if (!player) return;

      player.addEventListener("statechange", handleStateChange);
      setIsPlaying(player.isPlaying());
      setGlobalIsPlaying(player.isPlaying());

      return () => {
        player.removeEventListener("statechange", handleStateChange);
      };
    }, [player, setGlobalIsPlaying, timerControls, midiInfo]);

    useEffect(() => {
      if (file && player) {
        handleFileChange(file);
      }
    }, [file, player]);

    return (
      <CommonPlayerStyle
        fileName={fileName}
        isPlaying={isPlaying}
        // onFileChange={handleFileChange}
        onPlayPause={handlePlayPause}
        onStop={handleStop}
        onSeek={handleSeek}
        duration={duration}
        // accept=".mid,.midi"
      />
    );
  }
);

MidiPlayer.displayName = "MidiPlayer";
export default MidiPlayer;
