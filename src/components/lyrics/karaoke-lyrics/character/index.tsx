import React from "react";
import { LyricsCharacterStyle } from "../../lyrics-character";

interface LyricsCharacterProps extends LyricsCharacterStyle {
  clip: number;
  text: string;
  className?: string;
}

const LyricsCharacter: React.FC<LyricsCharacterProps> = ({
  clip,
  text,
  className,
  fontOutline = "font-outline-2 md:font-outline-4",
  ...props
}) => {
  const clipStyle = {
    transition: clip === 0 ? "" : "clip-path 0.2s ease-out",
    clipPath: `inset(-100% -100% -100% ${clip}%)`,
  };

  const textOver: React.CSSProperties | undefined = {
    display: "block",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "clip",
    height: "auto",
    maxHeight: "none",
    lineHeight: 1.5,
  };

  const fontWeight = props.fontWeight ? props.fontWeight : "bold";

  return (
    <div
      className={className}
      style={{
        // fontSize: props.fontSize ? props.fontSize : 35,
        position: "relative",
        left: 0,
        top: 0,
        fontWeight,
      }}
    >
      <div
        className={`absolute left-0 top-0 w-fit h-full z-30`}
        style={{
          ...clipStyle,
          ...textOver,
          color: props.color?.color ? props.color?.color : "#fcfe17",
        }}
      >
        {text}
      </div>

      <div
        className={`absolute ${fontOutline} left-0 top-0 w-fit h-full z-20`}
        style={{
          ...clipStyle,
          ...textOver,
          color: props.activeColor?.color ? props.activeColor.color : "#000000",
        }}
      >
        {text}
      </div>

      <div className="relative">
        <div
          style={{
            ...textOver,
            color: props.activeColor?.colorBorder
              ? props.activeColor.colorBorder
              : "#ffffff",
          }}
          className={`z-10 ${fontOutline} absolute top-0 left-0`}
        >
          {text}
        </div>

        <div
          style={{
            ...textOver,
            color: props.color?.colorBorder
              ? props.color.colorBorder
              : "#0000FF",
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
