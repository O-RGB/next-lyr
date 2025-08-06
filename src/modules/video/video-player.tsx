// src/modules/video/video-player.tsx

import { forwardRef, useImperativeHandle, useRef } from "react";
import { useKaraokeStore } from "../../stores/karaoke-store";
import ButtonCommon from "../../components/common/button";
import Card from "../../components/common/card";

// *** แก้ไข: ลบ onFileChange ออกจาก Props ***
type Props = {
  src: string | null;
};

export type VideoPlayerRef = {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
  videoEl: HTMLVideoElement | null;
};

const VideoPlayer = forwardRef<VideoPlayerRef, Props>(({ src }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // *** แก้ไข: ดึง action มาใช้โดยตรง ***
  const { loadVideoFile } = useKaraokeStore((state) => state.actions);

  useImperativeHandle(ref, () => ({
    play: () => videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
    seek: (time: number) => {
      if (videoRef.current) videoRef.current.currentTime = time;
    },
    getCurrentTime: () => videoRef.current?.currentTime ?? 0,
    isPlaying: () => !!videoRef.current && !videoRef.current.paused,
    videoEl: videoRef.current,
  }));

  // *** แก้ไข: handleFileChange เรียก action จาก store ***
  const handleFileChange = (file?: File) => {
    if (!file) return;
    const videoUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement("video");
    tempVideo.src = videoUrl;

    const handleMetadata = () => {
      loadVideoFile(videoUrl, file.name, tempVideo.duration);
      tempVideo.removeEventListener("loadedmetadata", handleMetadata);
    };

    tempVideo.addEventListener("loadedmetadata", handleMetadata);
  };

  return (
    <Card className="bg-white/50 p-4 rounded-lg w-full">
      <video
        ref={videoRef}
        src={src || ""}
        className="w-full rounded-lg bg-black mb-4"
        controls
      />
      <ButtonCommon
        onClick={() => fileInputRef.current?.click()}
        className="w-full p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
      >
        Choose Video File
      </ButtonCommon>
      <input
        type="file"
        ref={fileInputRef}
        accept="video/mp4"
        className="hidden"
        onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
      />
    </Card>
  );
});

VideoPlayer.displayName = "VideoPlayer";
export default VideoPlayer;
