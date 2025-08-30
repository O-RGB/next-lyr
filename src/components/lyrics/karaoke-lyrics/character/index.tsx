import React, { useEffect } from "react";
import { LyricsCharacterStyle } from "../../lyrics-character";

interface LyricsCharacterProps extends LyricsCharacterStyle {
  clip: number;
  text: string;
}

const LyricsCharacter: React.FC<LyricsCharacterProps> = ({ clip, text, ...props }) => {
  const clipStyle = {
    transition: clip === 0 ? "" : "clip-path 0.2s ease-out",
    clipPath: `inset(-100% -100% -100% ${clip}%)`,
  };

  const textOver: React.CSSProperties | undefined = {
    display: "inline-block",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "clip",
    height: "auto",
    maxHeight: "none",
    minHeight: "1.2em",
    lineHeight: "1.5",
  };

  return (
    <div
      style={{
        fontSize: props.fontSize ? props.fontSize : 35,
        position: "relative",
        left: 0,
        top: 0,
        fontWeight: "bold",
      }}
    >
      <div
        className={`absolute left-0 top-0 w-fit h-full z-30`}
        style={{
          ...clipStyle,
          ...textOver,
          color: "#fcfe17",
        }}
      >
        {text}
      </div>

      <div
        className={`absolute font-outline-2 md:font-outline-4 left-0 top-0 w-fit h-full z-20`}
        style={{
          ...clipStyle,
          ...textOver,
          color: "#000000",
        }}
      >
        {text}
      </div>

      <div className="relative">
        <div
          style={{
            ...textOver,
            color: "#ffffff",
          }}
          className="z-10 font-outline-2 md:font-outline-4 absolute top-0 left-0"
        >
          {text}
        </div>

        <div
          style={{
            ...textOver,
            color: "#0000FF",
          }}
          className="z-20 relative"
        >
          {text}
        </div>
      </div>
    </div>
  );
};

export default LyricsCharacter;
