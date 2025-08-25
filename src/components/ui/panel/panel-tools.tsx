import LyricsPlayer from "@/components/lyrics/karaoke-lyrics";
import MetadataForm from "@/components/metadata/metadata-form";
import LyricsPanel from "@/components/panel/lyrics-panel";
import React from "react";
import PlayerInit from "./player-init";
import { useKaraokeStore } from "@/stores/karaoke-store";
import useIsMobile from "@/hooks/useIsMobile";
import {
  FaArrowUp,
  FaArrowDown,
  FaArrowLeft,
  FaArrowRight,
  FaPlay,
  FaPause,
} from "react-icons/fa";

const MobileControls = () => {
  const isPlaying = useKaraokeStore((state) => state.isPlaying);
  const handleKeyDown = (key: string) => {
    const event = new KeyboardEvent("keydown", { code: key, bubbles: true });
    window.dispatchEvent(event);
  };

  // ใช้ position: fixed เพื่อยึด component ไว้ด้านล่างสุดของ viewport
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-2 lg:hidden bg-white/80 backdrop-blur-sm border-t border-gray-200"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 8px) + 8px)" }}
    >
      <div className="bg-gradient-to-r from-white via-gray-50 to-white px-4 py-2 rounded-xl shadow-lg border border-gray-300">
        <div className="flex items-center justify-center gap-4 w-full">
          {/* Play/Pause */}
          <button
            onClick={() => handleKeyDown("Space")}
            className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 active:from-blue-200 active:to-blue-300 border border-blue-300 hover:border-blue-400 shadow-md hover:shadow-lg active:shadow-inner transition-all duration-150 transform hover:scale-105 active:scale-95 select-none touch-manipulation h-10 w-10 rounded-lg"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <div className="flex items-center justify-center">
              {isPlaying ? (
                <FaPause className="h-4 w-4 text-blue-70" />
              ) : (
                <FaPlay className="h-4 w-4 text-blue-70" />
              )}
            </div>
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-gray-300" />

          {/* Up/Down */}
          <div className="flex gap-1">
            <button
              onClick={() => handleKeyDown("ArrowUp")}
              className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 active:from-gray-200 active:to-gray-300 border border-gray-300 hover:border-gray-400 shadow-md hover:shadow-lg active:shadow-inner transition-all duration-150 transform hover:scale-105 active:scale-95 select-none touch-manipulation h-10 w-10 rounded-lg"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <FaArrowUp className="h-3 w-3 text-gray-700 mx-auto" />
            </button>
            <button
              onClick={() => handleKeyDown("ArrowDown")}
              className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 active:from-gray-200 active:to-gray-300 border border-gray-300 hover:border-gray-400 shadow-md hover:shadow-lg active:shadow-inner transition-all duration-150 transform hover:scale-105 active:scale-95 select-none touch-manipulation h-10 w-10 rounded-lg"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <FaArrowDown className="h-3 w-3 text-gray-700 mx-auto" />
            </button>
          </div>

          {/* Separator */}
          <div className="h-6 w-px bg-slate-600" />

          {/* Left/Right */}
          <div className="flex gap-1">
            <button
              onClick={() => handleKeyDown("ArrowLeft")}
              className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 active:from-gray-200 active:to-gray-300 border border-gray-300 hover:border-gray-400 shadow-md hover:shadow-lg active:shadow-inner transition-all duration-150 transform hover:scale-105 active:scale-95 select-none touch-manipulation h-10 w-10 rounded-lg"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <FaArrowLeft className="h-3 w-3 text-gray-700 mx-auto" />
            </button>
            <button
              onClick={() => handleKeyDown("ArrowRight")}
              className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 active:from-gray-200 active:to-gray-300 border border-gray-300 hover:border-gray-400 shadow-md hover:shadow-lg active:shadow-inner transition-all duration-150 transform hover:scale-105 active:scale-95 select-none touch-manipulation h-10 w-10 rounded-lg"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <FaArrowRight className="h-3 w-3 text-gray-700 mx-auto" />
            </button>
          </div>

          {/* Status indicator */}
          <div
            className={`h-2 w-2 rounded-full transition-colors duration-300 ${
              isPlaying
                ? "bg-green-500 shadow-md shadow-green-500/50"
                : "bg-gray-400"
            }`}
          />
        </div>
      </div>
    </div>
  );
};

interface PanelToolsProps {}

const PanelTools: React.FC<PanelToolsProps> = ({}) => {
  const mode = useKaraokeStore((state) => state.mode);
  const projectId = useKaraokeStore((state) => state.projectId);
  const isMobile = useIsMobile();

  if (!projectId) {
    return (
      <div className="flex-grow flex items-center justify-center bg-gray-100">
        <div className="text-center text-gray-500">
          <h2 className="text-2xl font-semibold mb-2">
            Welcome to Lyrics Editor
          </h2>
          <p>Please open a project or create a new one to get started.</p>
        </div>
      </div>
    );
  }

  if (!mode) {
    return (
      <div className="flex flex-col lg:flex-row flex-grow w-full h-full overflow-hidden">
        <div className="flex-grow flex items-center justify-center bg-gray-100">
          <p className="text-gray-500">
            Please select a mode from the File menu to begin.
          </p>
        </div>
        <div className="lg:w-[25%] p-2 lg:p-4 lg:bg-slate-200/50 lg:border-l lg:border-slate-300">
          <div className="flex items-center justify-center h-full bg-gray-100 lg:bg-transparent">
            <p className="text-gray-500 text-center">
              Control Panel will appear here after selecting a mode.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    // เพิ่ม pb-[90px] (padding-bottom) สำหรับเวอร์ชันมือถือ เพื่อเว้นที่ให้ MobileControls ที่เป็น fixed
    <div className="flex flex-col lg:flex-row flex-grow w-full h-full overflow-hidden">
      <div className="relative flex-grow flex flex-col overflow-hidden h-full order-2 lg:order-1">
        <div className="h-full lg:h-[70%] overflow-auto">
          <LyricsPanel />
        </div>
        <div className="hidden lg:flex h-[30%] bg-gray-400 items-center justify-center">
          <LyricsPlayer />
        </div>
      </div>

      <div className="lg:w-[25%] p-0 lg:p-4 lg:bg-slate-200/50 lg:border-l lg:border-slate-300 lg:h-full lg:overflow-auto order-1 lg:order-2 flex-shrink-0">
        <PlayerInit />
        <div className="hidden lg:block">
          <MetadataForm />
        </div>
      </div>
      {/* MobileControls จะถูก render แยกและใช้ fixed position */}
      {isMobile && <MobileControls />}
    </div>
  );
};

export default PanelTools;
