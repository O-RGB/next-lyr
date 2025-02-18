import ButtonCommon from "@/components/button/button";
import Input from "@/components/input/input";
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
    <div className="flex gap-2">
      <Input
        value={text}
        onChange={(e) => {
          const value = e.target.value;
          setText(value.trim());
        }}
      ></Input>
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
