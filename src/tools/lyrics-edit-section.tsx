import ButtonCommon from "@/components/button/button";
import Input from "@/components/input/input";
import TextAreaCommon from "@/components/textarea";
import React, { useEffect, useState } from "react";

interface LyricsEditSectionProps {
  list: string[];
  onSave?: (value: string[]) => void;
}

const LyricsEditSection: React.FC<LyricsEditSectionProps> = ({
  list,
  onSave,
}) => {
  const [text, setText] = useState<string>("");
  useEffect(() => {
    setText(list.join("|"));
  }, [list]);
  return (
    <div className="flex flex-col gap-2 justify-end items-end w-full">
      <div className="w-full">
        <TextAreaCommon
          value={text}
          onChange={(e) => {
            const value = e.target.value;
            setText(value.trim());
          }}
        ></TextAreaCommon>
      </div>

      <ButtonCommon
        onClick={() => {
          onSave?.(text.split("|"));
        }}
      >
        บันทึก
      </ButtonCommon>
    </div>
  );
};

export default LyricsEditSection;
