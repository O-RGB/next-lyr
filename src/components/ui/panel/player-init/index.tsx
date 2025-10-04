import React, { useState } from "react";
import PlayerSetupWapper from "./wapper";
import PlayerHost, { PlayerRef } from "../../player-host";

interface PlayerInitProps {
  videoOnly?: boolean;
  containerClassName?: string;
}

const PlayerInit: React.FC<PlayerInitProps> = ({
  containerClassName,
  videoOnly,
}) => {
  const [playerRef, setPlayerRef] = useState<React.Ref<PlayerRef>>();
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  return (
    <>
      <PlayerSetupWapper
        isPlayerReady={isPlayerReady}
        onPlayerCreated={setPlayerRef}
      ></PlayerSetupWapper>

      <PlayerHost
        ref={playerRef}
        containerClassName={containerClassName}
        videoOnly={videoOnly}
        onReady={() => {
          setIsPlayerReady(true);
        }}
      />
    </>
  );
};

export default PlayerInit;
