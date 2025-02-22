import InputCommon from "@/components/input/input";
import useMidiPlayerStore from "@/stores/midi-plyer-store";
import React from "react";

interface MusicDetailFormProps {}

const MusicDetailForm: React.FC<MusicDetailFormProps> = ({}) => {
  const isPlay = useMidiPlayerStore((state) => state.isPlay);
  return (
    <div className="flex flex-col gap-2">
      <InputCommon disabled={!isPlay} label="ชื่อเพลง"></InputCommon>
      <InputCommon disabled={!isPlay} label="คีย์เพลง"></InputCommon>
      <InputCommon disabled={!isPlay} label="ศิลปิน"></InputCommon>
    </div>
  );
};

export default MusicDetailForm;
