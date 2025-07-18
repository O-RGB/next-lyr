import { useState, useEffect, RefObject } from "react";
import { Button } from "./common/button";
import { Card } from "./common/card";
import { BsPlay, BsPause, BsStop } from "react-icons/bs"; // Import icons

type Props = {
  src: string | null;
  audioRef: RefObject<HTMLAudioElement | null>;
  onFileChange: (file: File) => void;
  onPlay: () => void; // New prop
  onPause: () => void; // New prop
  onStop: () => void; // New prop
};

export default function AudioPlayer({
  src,
  audioRef,
  onFileChange,
  onPlay,
  onPause,
  onStop,
}: Props) {
  // Destructure new props
  const [currentTime, setCurrentTime] = useState("0:00");
  const [activeSpeed, setActiveSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false); // New state to track if audio is playing

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(formatTime(audio.currentTime || 0));
    const updatePlayState = () => setIsPlaying(!audio.paused); // Update internal state

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("play", updatePlayState);
    audio.addEventListener("pause", updatePlayState);
    audio.addEventListener("ended", updatePlayState); // Consider ended state

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
        <input type="file" className="h-4 w-4" /> Choose Audio File
      </label>
      <input
        type="file"
        id="audio-file-input"
        accept="audio/*"
        className="sr-only"
        onChange={(e) => e.target.files && onFileChange(e.target.files[0])}
      />
      <div className="flex items-center justify-center p-4 bg-slate-800 rounded-lg mb-3">
        <p className="text-5xl font-mono font-bold text-white tracking-wider">
          {currentTime}
        </p>
      </div>
      <audio ref={audioRef} src={src || ""} controls className="w-full" />
      <div className="flex justify-center items-center gap-2 mt-3">
        <Button onClick={onPlay} disabled={isPlaying}>
          <BsPlay className="mr-2 h-4 w-4" /> Play
        </Button>
        <Button onClick={onPause} disabled={!isPlaying}>
          <BsPause className="mr-2 h-4 w-4" /> Pause
        </Button>
        <Button onClick={onStop}>
          <BsStop className="mr-2 h-4 w-4" /> Stop
        </Button>
      </div>
      <div className="flex justify-center items-center gap-2 mt-3">
        {[0.75, 1, 1.5].map((speed) => (
          <Button
            key={speed}
            // variant={activeSpeed === speed ? "default" : "outline"} // You might need to adjust this if you have a variant prop
            // size="sm" // You might need to adjust this if you have a size prop
            onClick={() => handleSpeedChange(speed)}
          >
            {speed}x
          </Button>
        ))}
      </div>
    </Card>
  );
}
