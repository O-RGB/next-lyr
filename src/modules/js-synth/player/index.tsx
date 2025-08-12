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
import { TimerControls } from "@/components/ui/player-host";

// vvvvvvvvvv จุดแก้ไข: กำหนด Type ของ Ref ให้ชัดเจน vvvvvvvvvv
export type MidiPlayerRef = {
  play: () => void;
  pause: () => void;
  seek: (tick: number) => void;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
};
// ^^^^^^^^^^ สิ้นสุดจุดแก้ไข ^^^^^^^^^^

interface MidiPlayerProps {
  file?: File | null;
  onReady?: () => void;
  timerControls: TimerControls;
}

const MidiPlayer = forwardRef<MidiPlayerRef, MidiPlayerProps>(
  ({ file, onReady, timerControls }, ref) => {
    const [player, setPlayer] = useState<JsSynthPlayerEngine | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [fileName, setFileName] = useState("");
    const [duration, setDuration] = useState(0);

    const currentTime = useKaraokeStore((state) => state.currentTime);
    const midiInfo = useKaraokeStore((state) => state.playerState.midiInfo);
    const { loadMidiFile, setIsPlaying: setGlobalIsPlaying } = useKaraokeStore(
      (state) => state.actions
    );

    // vvvvvvvvvv จุดแก้ไข: สร้างฟังก์ชันสำหรับ Ref เพื่อให้มี context ที่ถูกต้อง vvvvvvvvvv
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
          // แปลงค่า ticks เป็นวินาที แล้วสั่งให้ worker ทำงาน
          if (midiInfo && midiInfo.bpm > 0 && midiInfo.ppq > 0) {
            const timeInSeconds = (tick / midiInfo.ppq) * (60 / midiInfo.bpm);
            timerControls.seekTimer(timeInSeconds);
          }
        },
        getCurrentTime: () => player?.getCurrentTime() ?? 0,
        isPlaying: () => player?.isPlaying() ?? false,
      }),
      [player, midiInfo, timerControls]
    ); // ใส่ dependencies ให้ครบ
    // ^^^^^^^^^^ สิ้นสุดจุดแก้ไข ^^^^^^^^^^

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
      if (file && player) {
        handleFileChange(file);
      }
    }, [file, player]);

    // vvvvvvvvvv จุดแก้ไข: จัดการการ Play/Pause และ Sync กับ Worker vvvvvvvvvv
    useEffect(() => {
      if (!player) return;

      const handleStateChange = (playing: boolean) => {
        setIsPlaying(playing);
        setGlobalIsPlaying(playing);

        if (playing) {
          // เมื่อเริ่มเล่น, Sync เวลาของ worker กับ player ก่อน
          if (midiInfo && midiInfo.bpm > 0 && midiInfo.ppq > 0) {
            const timeInSeconds =
              (player.getCurrentTime() / midiInfo.ppq) * (60 / midiInfo.bpm);
            timerControls.seekTimer(timeInSeconds);
          }
          timerControls.startTimer();
        } else {
          timerControls.stopTimer();
        }
      };

      player.addEventListener("statechange", handleStateChange);
      setIsPlaying(player.isPlaying());
      setGlobalIsPlaying(player.isPlaying());

      return () => {
        player.removeEventListener("statechange", handleStateChange);
      };
    }, [player, setGlobalIsPlaying, timerControls, midiInfo]);
    // ^^^^^^^^^^ สิ้นสุดจุดแก้ไข ^^^^^^^^^^

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

    // vvvvvvvvvv จุดแก้ไข: ให้ handleSeek เรียกใช้ฟังก์ชันที่ expose ผ่าน ref vvvvvvvvvv
    const handleSeek = (value: number) => {
      const currentRef = ref as React.RefObject<MidiPlayerRef>;
      currentRef.current?.seek(value);
    };
    // ^^^^^^^^^^ สิ้นสุดจุดแก้ไข ^^^^^^^^^^

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
