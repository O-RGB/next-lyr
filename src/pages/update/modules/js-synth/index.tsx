import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { FaPlay, FaPause, FaFolderOpen, FaStop } from "react-icons/fa";
import { JsSynthEngine } from "./lib/js-synth-engine";
import { JsSynthPlayerEngine } from "./lib/js-synth-player";
import { MidiDecode } from "../../lib/midi-tags-decode";

export type MidiPlayerRef = JsSynthPlayerEngine | null;

interface MidiPlayerProps {
  onFileLoaded?: (
    file: File,
    durationTicks: number,
    ppq: number,
    bpm: number
  ) => void;
  onTickChange?: (tick: number) => void; // <-- ADDED: Callback for tick updates
}

const MidiPlayer = forwardRef<MidiPlayerRef, MidiPlayerProps>(
  ({ onFileLoaded, onTickChange }, ref) => {
    const [player, setPlayer] = useState<JsSynthPlayerEngine | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTick, setCurrentTick] = useState(0);
    const [currentBpm, setCurrentBpm] = useState(120);
    const [duration, setDuration] = useState(0);
    const [fileName, setFileName] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);

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

      const handleTickUpdate = (tick: number, bpm: number) => {
        setCurrentTick(tick);
        setCurrentBpm(bpm);
        onTickChange?.(tick); // <-- ADDED: Call the new prop
      };
      const handleStateChange = (playing: boolean) => setIsPlaying(playing);

      player.addEventListener("tickupdate", handleTickUpdate);
      player.addEventListener("statechange", handleStateChange);

      setCurrentTick(player.currentTick);
      setCurrentBpm(player.currentBpm);
      setIsPlaying(player.isPlaying);
      setDuration(player.durationTicks);

      return () => {
        player.removeEventListener("tickupdate", handleTickUpdate);
        player.removeEventListener("statechange", handleStateChange);
      };
    }, [player, onTickChange]);

    const handleLoadMidiFile = async (file: File) => {
      if (player) {
        try {
          const test = new MidiDecode(await file.arrayBuffer());
          const te = await test.parse();
          console.log(te);
          const midiInfo = await player.loadMidi(file);
          setFileName(file.name);
          setDuration(midiInfo.durationTicks);
          // MODIFIED: Pass more data back up
          onFileLoaded?.(
            file,
            midiInfo.durationTicks,
            midiInfo.ppq,
            midiInfo.bpm
          );
        } catch (error) {
          console.error("Error loading MIDI file:", error);
          setFileName("Error: Invalid MIDI file");
        }
      }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleLoadMidiFile(file);
    };

    const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!player || duration === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clickPosition = (e.clientX - rect.left) / rect.width;
      const seekTick = Math.floor(duration * clickPosition);
      player.seek(seekTick);
    };

    const progressPercentage =
      duration > 0 ? (currentTick / duration) * 100 : 0;

    return (
      <div className="bg-white/50 p-4 rounded-lg">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 p-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition mb-4"
        >
          <FaFolderOpen className="h-5 w-5" />
          <span>{fileName || "Select MIDI File"}</span>
        </button>
        <input
          type="file"
          accept=".mid,.midi"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
        />

        <div
          className="relative h-2 bg-gray-300 rounded-full cursor-pointer"
          onClick={handleProgressBarClick}
        >
          <div
            className="bg-blue-500 h-2 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs font-mono mt-1">
          <span>Tick: {currentTick}</span>
          <span>BPM: {Math.round(currentBpm)}</span>
          <span>Duration: {duration}</span>
        </div>

        <div className="flex justify-center items-center gap-4 mt-4">
          <button
            onClick={() => player?.play()}
            disabled={isPlaying || !fileName}
            className="p-3 bg-white rounded-full shadow-md disabled:opacity-50"
          >
            <FaPlay className="h-6 w-6 text-gray-700" />
          </button>
          <button
            onClick={() => player?.pause()}
            disabled={!isPlaying}
            className="p-3 bg-white rounded-full shadow-md disabled:opacity-50"
          >
            <FaPause className="h-6 w-6 text-gray-700" />
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
  }
);
MidiPlayer.displayName = "MidiPlayer";
export default MidiPlayer;
