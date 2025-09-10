import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import CommonPlayerStyle from "@/components/common/player";
import { JsSynthEngine } from "../lib/js-synth-engine";
import { JsSynthPlayerEngine } from "../lib/js-synth-player";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { useTimerStore } from "@/hooks/useTimerWorker";
import { parseMidi } from "../../../lib/karaoke/midi/reader";

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
          timerControls.seekTimer(tick);
        },
        getCurrentTime: () => useKaraokeStore.getState().currentTime,
        isPlaying: () => player?.isPlaying() ?? false,
      }),
      [player, timerControls]
    );

    const handleFileChange = async (file: File) => {
      if (player) {
        try {
          const parsedMidi = await parseMidi(file);
          const midiInfo = await player.loadMidi(file);

          if (midiInfo.tempos) {
            timerControls.updateTempoMap(midiInfo.tempos);
          }

          if (midiInfo.ticksPerBeat) {
            timerControls.updatePpq(midiInfo.ticksPerBeat);
          }

          setDuration(midiInfo.duration);
          setFileName(file.name);
          loadMidiFile(parsedMidi, file);
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

    const handleStateChange = useCallback(
      (playing: boolean) => {
        setIsPlaying(playing);
        setGlobalIsPlaying(playing);

        if (playing) {
          timerControls.startTimer();
        } else {
          timerControls.stopTimer();
        }
      },
      [setGlobalIsPlaying, timerControls]
    );

    const initialize = async () => {
      const engine = new JsSynthEngine();
      await engine.startup();
      if (engine.player) {
        setPlayer(engine.player);
      }
    };

    useEffect(() => {
      timerControls.initWorker();
      return () => {
        timerControls.terminateWorker();
      };
    }, [timerControls.initWorker, timerControls.terminateWorker]);

    useEffect(() => {
      console.log("initialize midi player");
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
    }, [player, setGlobalIsPlaying, handleStateChange]);

    useEffect(() => {
      if (file && player) {
        handleFileChange(file);
      }
    }, [file, player]);

    return (
      <CommonPlayerStyle
        fileName={fileName}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onStop={handleStop}
        onSeek={handleSeek}
        duration={duration}
      />
    );
  }
);

MidiPlayer.displayName = "MidiPlayer";
export default MidiPlayer;
