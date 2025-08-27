import { usePlayerSetup } from "@/hooks/usePlayerSetup";
import { useKaraokeStore } from "@/stores/karaoke-store";
import React, { useEffect } from "react";
import { PlayerRef } from "../../player-host";

interface PlayerSetupWapperProps {
  isPlayerReady: boolean;
  onPlayerCreated?: (ref: React.Ref<PlayerRef>) => void;
}

const PlayerSetupWapper: React.FC<PlayerSetupWapperProps> = ({
  isPlayerReady,
  onPlayerCreated,
}) => {
  const mode = useKaraokeStore((state) => state.mode);
  const projectId = useKaraokeStore((state) => state.projectId);
  const rawFile = useKaraokeStore((state) => state.playerState.rawFile);
  const duration = useKaraokeStore((state) => state.playerState.duration);

  const playerSetup = usePlayerSetup(
    projectId,
    rawFile,
    mode,
    duration,
    isPlayerReady
  );

  useEffect(() => {
    if (playerSetup.playerRef) {
      onPlayerCreated?.(playerSetup.playerRef);
    }
  }, [playerSetup.playerRef]);

  return null;
};

export default PlayerSetupWapper;
