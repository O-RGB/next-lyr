import LyricsPlayer from "@/components/lyrics/karaoke-lyrics";
import MetadataForm from "@/components/metadata/metadata-form";
import LyricsPanel from "@/components/panel/lyrics-panel";
import React, { useState } from "react";
import PlayerHost from "../player-host";
import { usePlayerSetup } from "@/hooks/usePlayerSetup";
import { useKaraokeStore } from "@/stores/karaoke-store";

interface PanelToolsProps {}

const PanelTools: React.FC<PanelToolsProps> = ({}) => {
  const lyricsProcessed = useKaraokeStore((state) => state.lyricsProcessed);
  const projectId = useKaraokeStore((state) => state.projectId);
  const mode = useKaraokeStore((state) => state.mode);
  const rawFile = useKaraokeStore((state) => state.playerState.rawFile);
  const duration = useKaraokeStore((state) => state.playerState.duration);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  const playerSetup = usePlayerSetup(
    projectId,
    rawFile,
    mode,
    duration,
    isPlayerReady
  );

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
    <div className="flex flex-col md:flex-row flex-grow w-full h-full overflow-hidden">
      <div className="flex-grow flex flex-col overflow-hidden h-full order-2 md:order-1">
        <div className="h-full md:h-[70%]">
          <LyricsPanel />
        </div>

        <div className="hidden md:flex h-[30%] bg-gray-400 items-center justify-center">
          {lyricsProcessed?.ranges.length ? (
            <LyricsPlayer lyricsProcessed={lyricsProcessed} />
          ) : (
            <p className="text-white">Lyrics Preview</p>
          )}
        </div>
      </div>

      <div className="md:w-[25%] p-2 md:p-4 md:bg-slate-200/50 md:border-l md:border-slate-300 md:h-full md:overflow-auto order-3 md:order-1">
        <PlayerHost
          ref={playerSetup.playerRef}
          onReady={() => {
            setIsPlayerReady(true);
          }}
        />
        <div className="hidden md:block mt-4">
          <MetadataForm />
        </div>
      </div>
    </div>
  );
};

export default PanelTools;
