import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { FaPlay, FaPause, FaFolderOpen, FaStop } from "react-icons/fa";
import { JsSynthEngine } from "../lib/js-synth-engine";
import { JsSynthPlayerEngine } from "../lib/js-synth-player";
import * as LyrEditer from "../../midi-klyr-parser/lib/processor";
import Upload from "@/components/common/data-input/upload";
import ButtonCommon from "../../../components/common/button";
import { ParseResult } from "../../midi-klyr-parser/lib/processor";
import { useKaraokeStore } from "@/stores/karaoke-store";

export type MidiPlayerRef = JsSynthPlayerEngine | null;

interface MidiPlayerProps {}

const MidiPlayer = forwardRef<MidiPlayerRef, MidiPlayerProps>((props, ref) => {
  const [player, setPlayer] = useState<JsSynthPlayerEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState("");
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
    if (!player) return;

    const handleTickUpdate = (tick: number) => setCurrentTime(tick);
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

        setFileName(file.name);

        loadMidiFile(
          {
            fileName: file.name,
            durationTicks: midiInfo.durationTicks,
            ppq: midiInfo.ppq,
            bpm: midiInfo.bpm,
            raw: parsedMidi,
          },
          parsedMidi
        );
      } catch (error) {
        console.error("Error loading MIDI file:", error);
        setFileName("Error: Invalid MIDI file");
        alert("Could not load MIDI file. It may be invalid.");
      }
    }
  };

  return (
    <div className="bg-white/50 p-4 rounded-lg flex items-center justify-center gap-4">
      <Upload
        customNode={
          <ButtonCommon icon={<FaFolderOpen />}>
            <div className="line-clamp-1">{fileName || "Select MIDI File"}</div>
          </ButtonCommon>
        }
        accept=".mid,.midi"
        className="w-full"
        preview={false}
        onChange={(files) => {
          const [file] = files;
          if (file) handleFileChange(file);
        }}
      />

      <div className="flex justify-center items-center gap-4">
        <button
          onClick={() =>
            player?.isPlaying() ? player?.pause() : player?.play()
          }
          disabled={!fileName}
          className="p-3 bg-white rounded-full shadow-md disabled:opacity-50"
        >
          {isPlaying ? (
            <FaPause className="h-6 w-6 text-gray-700" />
          ) : (
            <FaPlay className="h-6 w-6 text-gray-700" />
          )}
        </button>
        <button
          onClick={() => player?.stop()}
          disabled={!fileName}
          className="p-3 bg-white rounded-full shadow-md disabled:opacity-50"
        >
          <FaStop className="h-6 w-6 text-gray-700" />
        </button>
      </div>
    </div>
  );
});

MidiPlayer.displayName = "MidiPlayer";
export default MidiPlayer;
