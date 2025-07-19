import InputCommon from "@/components/input/input";
import React, { useState } from "react";

interface MusicDetailFormProps {}

const MusicDetailForm: React.FC<MusicDetailFormProps> = ({}) => {
  const [values, setValues] = useState({
    songId: "",
    songName: "",
    songKey: "",
    artist: "",
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const updated = { ...values, [event.target.name]: event.target.value };
    setValues({ ...values, [event.target.name]: event.target.value });
  };

  return (
    <form className="flex flex-col gap-2 w-full">
      <div className="flex gap-2 w-full">
        <InputCommon
          //   disabled={!isPlay}
          label="รหัสเพลง"
          name="songId"
          value={values.songId}
          onChange={handleChange}
        />
        <InputCommon
          //   disabled={!isPlay}
          label="ชื่อเพลง"
          name="songName"
          value={values.songName}
          onChange={handleChange}
        />
      </div>
      <div className="flex gap-2 w-full">
        <InputCommon
          //   disabled={!isPlay}
          label="คีย์เพลง"
          name="songKey"
          value={values.songKey}
          onChange={handleChange}
        />
        <InputCommon
          //   disabled={!isPlay}
          label="ศิลปิน"
          name="artist"
          value={values.artist}
          onChange={handleChange}
        />
      </div>
    </form>
  );
};

export default MusicDetailForm;
