import ButtonCommon from "@/components/button/button";
import useMidiPlayerStore from "@/stores/midi-plyer-store";
import React, { useEffect } from "react";
import {
  TbPlayerPauseFilled,
  TbPlayerPlayFilled,
  TbPlayerStopFilled,
} from "react-icons/tb";

interface MidiPlayerProps {}

const MidiPlayer: React.FC<MidiPlayerProps> = ({}) => {
  const isPlay = useMidiPlayerStore((state) => state.isPlay);
  const play = useMidiPlayerStore((state) => state.play);
  const pause = useMidiPlayerStore((state) => state.pause);
  const stop = useMidiPlayerStore((state) => state.stop);

  useEffect(() => {}, [isPlay]);
  return (
    <div className="flex gap-2">
      <ButtonCommon
        onClick={!isPlay ? play : pause}
        icon={
          !isPlay ? (
            <TbPlayerPlayFilled></TbPlayerPlayFilled>
          ) : (
            <TbPlayerPauseFilled></TbPlayerPauseFilled>
          )
        }
      ></ButtonCommon>
      <ButtonCommon
        onClick={stop}
        // disabled={!isPlay}
        icon={<TbPlayerStopFilled></TbPlayerStopFilled>}
      ></ButtonCommon>
    </div>
  );
};

export default MidiPlayer;
