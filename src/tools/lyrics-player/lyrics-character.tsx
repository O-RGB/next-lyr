import React from "react";

interface LyricsCharacterProps {
  lyr: string;
  color?: string;
  size?: "lg" | "md" | "sm";
  clip: number;
}

const LyricsCharacter: React.FC<LyricsCharacterProps> = ({
  lyr,
  color = "#fff",
  size = "md",
  clip,
}) => {
  const textSize =
    size === "lg"
      ? "text-5xl"
      : size === "md"
      ? "text-6xl"
      : size === "sm"
      ? "text-2xl"
      : "text-8xl";

  const lyric = <pre>{lyr}</pre>;

  const clipStyle = {
    transition: clip === 0 ? "" : "clip-path 0.3s ease-in",
    clipPath: `inset(-100% -100% -100% ${clip}%)`,
  };
  const textOver = {
    lineHeight: 3,
    // letterSpacing: "0.05em",
    padding: "0 5px",
  };
  return (
    <>
      <div className={`${textSize} font-bold relative left-0 top-0`}>
        <div
          className={`absolute left-0 top-0 w-full h-full z-30 text-[#ead008]`}
          style={{
            ...clipStyle,
            ...textOver,
          }}
        >
          {lyric}
        </div>

        <div
          className={`absolute font-outline-4 left-0 top-0 w-full h-full z-20 text-black`}
          style={{
            ...clipStyle,
            ...textOver,
          }}
        >
          {lyric}
        </div>

        <div className="relative">
          <div
            style={{
              ...textOver,
            }}
            className="text-white z-10 font-outline-4 absolute top-0 left-0"
          >
            {lyric}
          </div>
          <div
            style={{
              ...textOver,
            }}
            className="text-blue-500 z-20 relative"
          >
            {lyric}
          </div>
        </div>
      </div>
    </>
  );
};

export default LyricsCharacter;
