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
  const midiFileNamePlaying = useMidiPlayerStore(
    (state) => state.midiFileNamePlaying
  );
  const play = useMidiPlayerStore((state) => state.play);
  const pause = useMidiPlayerStore((state) => state.pause);
  const stop = useMidiPlayerStore((state) => state.stop);
  const measure = useMidiPlayerStore((state) => state.measure);
  const beat = useMidiPlayerStore((state) => state.beat);

  useEffect(() => {}, [isPlay]);

  return (
    <div className="flex gap-2">
      <div className="flex text-xl w-fit px-3 bg-blue-500 rounded-md pointer-events-none select-none">
        <div className="m-auto text-white font-bold mt-0.5 text-nowrap">
          {measure} : {beat}
        </div>
      </div>
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
        icon={<TbPlayerStopFilled></TbPlayerStopFilled>}
      ></ButtonCommon>

      <div className="flex justify-end w-full ml-2 lg:ml-10">
        {midiFileNamePlaying && (
          <div className="my-auto text-xs line-clamp-2">
            {midiFileNamePlaying}
          </div>
        )}
      </div>
    </div>
  );
};

export default MidiPlayer;
