import React from "react";
import { FaPlay, FaPause, FaStop, FaFolderOpen } from "react-icons/fa";
import Upload from "@/components/common/data-input/upload";
import ButtonCommon from "@/components/common/button";

interface CommonPlayerStyleProps {
  fileName: string;
  isPlaying: boolean;
  onFileChange: (file: File) => void;
  onPlayPause: () => void;
  onStop: () => void;
  onSeek: (value: number) => void;
  duration: number;
  currentTime: number;
  accept?: string; // เพิ่ม prop สำหรับรับประเภทไฟล์
  upload?: boolean;
}

const CommonPlayerStyle: React.FC<CommonPlayerStyleProps> = ({
  fileName,
  isPlaying,
  onFileChange,
  onPlayPause,
  onStop,
  onSeek,
  duration,
  currentTime,
  accept,
  upload = true,
}) => {
  return (
    <div className="bg-white/50 p-4 rounded-lg flex items-center justify-center gap-4 w-full">
      {/* ส่วนอัปโหลดไฟล์ */}
      {upload && (
        <Upload
          customNode={<ButtonCommon icon={<FaFolderOpen />}></ButtonCommon>}
          accept={accept}
          className="flex-none"
          preview={false}
          onChange={(files) => {
            console.log(files);
            const [file] = files;
            if (file) onFileChange(file);
          }}
        />
      )}

      {/* ปุ่มควบคุม Player */}
      <div className="flex justify-center items-center gap-2">
        <button
          onClick={onPlayPause}
          disabled={!fileName}
          className="p-3 bg-white rounded-full shadow-md disabled:opacity-50 transition-transform transform active:scale-90"
        >
          {isPlaying ? (
            <FaPause className="h-5 w-5 text-gray-700" />
          ) : (
            <FaPlay className="h-5 w-5 text-gray-700" />
          )}
        </button>
        <button
          onClick={onStop}
          disabled={!fileName}
          className="p-3 bg-white rounded-full shadow-md disabled:opacity-50 transition-transform transform active:scale-90"
        >
          <FaStop className="h-5 w-5 text-gray-700" />
        </button>
      </div>

      {/* แถบ Seek */}
      <input
        type="range"
        min="0"
        max={duration || 100}
        value={currentTime}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50"
        disabled={!fileName}
      />
    </div>
  );
};

export default CommonPlayerStyle;
