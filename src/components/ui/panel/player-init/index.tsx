import React, { useState } from "react";
import PlayerSetupWapper from "./wapper";
import PlayerHost, { PlayerRef } from "../../player-host";

interface PlayerInitProps {}

const PlayerInit: React.FC<PlayerInitProps> = ({}) => {
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
        onReady={() => {
          setIsPlayerReady(true);
        }}
      />
    </>
  );
};

export default PlayerInit;
