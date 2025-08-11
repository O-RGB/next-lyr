import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { JsSynthEngine } from "../lib/js-synth-engine";
import { JsSynthPlayerEngine } from "../lib/js-synth-player";
import * as LyrEditer from "../../midi-klyr-parser/lib/processor";
import { useKaraokeStore } from "@/stores/karaoke-store";
import CommonPlayerStyle from "@/components/common/player";

export type MidiPlayerRef = JsSynthPlayerEngine | null;

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
    const [currentTime, setCurrentTimeState] = useState(0);
    const {
      loadMidiFile,
      setCurrentTime,
      setIsPlaying: setGlobalIsPlaying,
    } = useKaraokeStore((state) => state.actions);

    useImperativeHandle(ref, () => (player ? player : null)!, [player]);

    useEffect(() => {
      const initialize = async () => {
        const engine = await JsSynthEngine.getInstance();
        if (engine.player) {
          setPlayer(engine.player);
        }
      };
      initialize();
    }, []);

    useEffect(() => {
      console.log(file, player);
      if (file && player) {
        handleFileChange(file);
      }
    }, [file, player]);

    useEffect(() => {
      if (!player) return;

      const handleTickUpdate = (tick: number) => {
        setCurrentTime(tick);
        setCurrentTimeState(tick);
      };
      const handleStateChange = (playing: boolean) => {
        setIsPlaying(playing);
        setGlobalIsPlaying(playing);
      };

      player.addEventListener("tickupdate", handleTickUpdate);
      player.addEventListener("statechange", handleStateChange);

      setIsPlaying(player.isPlaying());
      setGlobalIsPlaying(player.isPlaying());

      return () => {
        player.removeEventListener("tickupdate", handleTickUpdate);
        player.removeEventListener("statechange", handleStateChange);
      };
    }, [player, setCurrentTime, setGlobalIsPlaying]);

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
      player?.seek(value);
    };

    return (
      <CommonPlayerStyle
        fileName={fileName}
        isPlaying={isPlaying}
        onFileChange={handleFileChange}
        onPlayPause={handlePlayPause}
        onStop={handleStop}
        onSeek={handleSeek}
        duration={duration}
        currentTime={currentTime}
        accept=".mid,.midi"
      />
    );
  }
);

MidiPlayer.displayName = "MidiPlayer";
export default MidiPlayer;
