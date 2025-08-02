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
import {
  ChordEvent,
  LyricEvent,
  SongInfo,
} from "../../midi-klyr-parser/lib/processor";

export interface MidiParseResult {
  info: SongInfo;
  lyrics: LyricEvent[][];
  chords: ChordEvent[];
  firstNoteOnTick?: number;
}
export type MidiPlayerRef = JsSynthPlayerEngine | null;

interface MidiPlayerProps {
  onFileLoaded?: (
    file: File,
    durationTicks: number,
    ppq: number,
    bpm: number,
    firstNoteOnTick: number
  ) => void;
  onTickChange?: (tick: number) => void;
  onLyricsParsed?: (data: MidiParseResult) => void;
}

const MidiPlayer = forwardRef<MidiPlayerRef, MidiPlayerProps>(
  ({ onFileLoaded, onTickChange, onLyricsParsed }, ref) => {
    const [player, setPlayer] = useState<JsSynthPlayerEngine | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    // const [currentTick, setCurrentTick] = useState(0);
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
        // setCurrentTick(tick);
        setCurrentBpm(bpm);
        onTickChange?.(tick);
      };
      const handleStateChange = (playing: boolean) => setIsPlaying(playing);

      player.addEventListener("tickupdate", handleTickUpdate);
      player.addEventListener("statechange", handleStateChange);

      // setCurrentTick(player.currentTick);
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
          const midiDecoder = LyrEditer.parse(await file.arrayBuffer());

          const midiInfo = await player.loadMidi(file);
          console.log("midiInfo", midiDecoder);
          setFileName(file.name);
          setDuration(midiInfo.durationTicks);

          onFileLoaded?.(
            file,
            midiInfo.durationTicks,
            midiInfo.ppq,
            midiInfo.bpm,
            midiDecoder.firstNoteOnTick ?? 0
          );

          onLyricsParsed?.({
            chords: midiDecoder.chords,
            info: midiDecoder.info,
            lyrics: midiDecoder.lyrics,
            firstNoteOnTick: midiDecoder.firstNoteOnTick ?? undefined,
          });
        } catch (error) {
          console.error("Error loading MIDI file:", error);
          setFileName("Error: Invalid MIDI file");
        }
      }
    };

    const handleFileChange = (file: File) => {
      handleLoadMidiFile(file);
    };
    return (
      <div className="bg-white/50 p-4 rounded-lg flex items-center justify-center gap-4">
        <Upload
          customNode={
            <ButtonCommon icon={<FaFolderOpen></FaFolderOpen>}>
              <div className="line-clamp-1">
                {fileName || "Select MIDI File"}
              </div>
            </ButtonCommon>
          }
          accept=".mid,.midi"
          className="w-full"
          preview={false}
          onChange={(files) => {
            const [file] = files;
            if (file) {
              handleFileChange(file);
            }
          }}
        />

        <div className="flex justify-center items-center gap-4">
          <button
            onClick={() => (isPlaying ? player?.pause() : player?.play())}
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
  }
);
MidiPlayer.displayName = "MidiPlayer";
export default MidiPlayer;
