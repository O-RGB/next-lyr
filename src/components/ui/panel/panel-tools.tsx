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
  const handleKeyDown = (key: string) => {
    const event = new KeyboardEvent("keydown", { code: key, bubbles: true });
    window.dispatchEvent(event);
  };

  return (
    <div className="bg-white/50 p-4 rounded-lg flex items-center justify-center gap-4 w-full">
      <button onClick={() => handleKeyDown("ArrowLeft")}>
        <FaArrowLeft className="h-5 w-5 text-gray-800" />
      </button>

      <button onClick={() => handleKeyDown("ArrowUp")}>
        <FaArrowUp className="h-5 w-5 text-gray-800" />
      </button>

      <button onClick={() => handleKeyDown("ArrowDown")}>
        <FaArrowDown className="h-5 w-5 text-gray-800" />
      </button>

      <button onClick={() => handleKeyDown("ArrowRight")}>
        <FaArrowRight className="h-5 w-5 text-gray-800" />
      </button>
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
      <div className="flex flex-col md:flex-row flex-grow w-full h-full overflow-hidden">
        <div className="flex-grow flex items-center justify-center bg-gray-100">
          <p className="text-gray-500">
            Please select a mode from the File menu to begin.
          </p>
        </div>
        <div className="md:w-[25%] p-2 md:p-4 md:bg-slate-200/50 md:border-l md:border-slate-300">
          <div className="flex items-center justify-center h-full bg-gray-100 md:bg-transparent">
            <p className="text-gray-500 text-center">
              Control Panel will appear here after selecting a mode.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col md:flex-row flex-grow w-full h-full overflow-hidden">
        <div className="relative flex-grow flex flex-col overflow-hidden h-full order-2 md:order-1">
          <div className="h-full md:h-[70%]">
            <LyricsPanel />
          </div>
          <div className="hidden md:flex h-[30%] bg-gray-400 items-center justify-center">
            <LyricsPlayer />
          </div>
        </div>

        <div className="md:w-[25%] p-2 md:p-4 md:bg-slate-200/50 md:border-l md:border-slate-300 md:h-full md:overflow-auto order-3 md:order-1">
          {isMobile && <MobileControls />}
          <PlayerInit></PlayerInit>
          <div className="hidden md:block mt-4">
            <MetadataForm />
          </div>
        </div>
      </div>
    </>
  );
};

export default PanelTools;
