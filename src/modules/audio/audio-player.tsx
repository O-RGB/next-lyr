// update/modules/audio/audio-player.tsx
import { useState, useEffect, RefObject } from "react";
import { useKaraokeStore } from "../../stores/karaoke-store"; // <-- import store
import { BsPlay, BsPause, BsStop } from "react-icons/bs";
import ButtonCommon from "../../components/common/button";
import Card from "../../components/common/card";
import { MusicParseResult } from "../js-synth/player";
import { LyricEvent } from "../midi-klyr-parser/klyr-parser-lib";
import { readMp3 } from "../mp3-klyr-parser/read";

type Props = {
  src: string | null;
  audioRef: RefObject<HTMLAudioElement | null>;
  onFileChange: (file: File, lyricsParsed: MusicParseResult) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
};

export default function AudioPlayer({
  src,
  audioRef,
  onFileChange,
  onPlay,
  onPause,
  onStop,
}: Props) {
  const actions = useKaraokeStore((state) => state.actions);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [activeSpeed, setActiveSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Effect นี้ใช้สำหรับอ่านค่า duration ของไฟล์เสียง
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    const handleLoadedMetadata = () => {
      // เช็คว่า duration มีค่าที่ถูกต้อง
      if (audio.duration && isFinite(audio.duration)) {
        actions.setAudioDuration(audio.duration);
      }
    };

    // เพิ่ม event listener เมื่อ metadata ของไฟล์โหลดเสร็จ
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    // กรณีที่ metadata โหลดไปแล้วก่อนที่ effect จะทำงาน
    if (audio.readyState >= 1) {
      handleLoadedMetadata();
    }

    // cleanup function
    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [src, audioRef, actions]);

  const onUploadFile = async (file?: File) => {
    if (!file) return;
    const { parsedData, audioData } = await readMp3(file);
    // const lyricsToSce: LyricEvent[][] = parsedData.lyrics.map((x) => {
    //   return x.map((y) => ({ ...y, tick: y.tick / 1000 }));
    // });
    // console.log("lyricsToSce, ", lyricsToSce);
    onFileChange?.(file, {
      chords: parsedData.chords,
      info: parsedData.info,
      lyrics: parsedData.lyrics,
    });
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(formatTime(audio.currentTime || 0));
    const updatePlayState = () => setIsPlaying(!audio.paused);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("play", updatePlayState);
    audio.addEventListener("pause", updatePlayState);
    audio.addEventListener("ended", updatePlayState);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("play", updatePlayState);
      audio.removeEventListener("pause", updatePlayState);
      audio.removeEventListener("ended", updatePlayState);
    };
  }, [audioRef]);

  const handleSpeedChange = (speed: number) => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
    setActiveSpeed(speed);
  };

  return (
    <Card className="bg-white/50 p-4 rounded-lg w-full">
      <label
        htmlFor="audio-file-input"
        className="cursor-pointer flex items-center justify-center gap-2 text-sm font-medium text-slate-600 mb-3"
      >
        Choose Audio File
      </label>
      <input
        type="file"
        id="audio-file-input"
        accept="audio/*"
        className="sr-only"
        onChange={(e) => e.target.files && onUploadFile(e.target.files[0])}
      />

      <audio ref={audioRef} src={src || ""} controls className="w-full" />
      <div className="flex justify-center items-center gap-2 mt-3">
        <ButtonCommon onClick={onPlay} disabled={isPlaying}>
          <BsPlay className="mr-2 h-4 w-4" /> Play
        </ButtonCommon>
        <ButtonCommon onClick={onPause} disabled={!isPlaying}>
          <BsPause className="mr-2 h-4 w-4" /> Pause
        </ButtonCommon>
        <ButtonCommon onClick={onStop}>
          <BsStop className="mr-2 h-4 w-4" /> Stop
        </ButtonCommon>
      </div>
      {/* <div className="flex justify-center items-center gap-2 mt-3">
        {[0.75, 1, 1.5].map((speed) => (
          <ButtonCommon key={speed} onClick={() => handleSpeedChange(speed)}>
            {speed}x
          </ButtonCommon>
        ))}
      </div> */}
    </Card>
  );
}
