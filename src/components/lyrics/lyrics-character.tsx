export interface LyricsCharacterStyle {
  color?: {
    color?: string;
    colorBorder?: string;
  };
  activeColor?: {
    color?: string;
    colorBorder?: string;
  };
  fontSize?: number | string;
  fontWeight?: number | string;
  fontOutline?: string;
}

export interface LyricsCharacterProps extends LyricsCharacterStyle {
  lyr: string;
  vocal?: string;
  status: "inactive" | "active" | "completed";
  duration: number;
}

// const LyricsCharacter: React.FC<LyricsCharacterProps> = ({
//   lyr,
//   vocal,
//   status,
//   duration,
//   fontSize = 48,
//   color,
//   activeColor,
// }) => {
//   let clipPathValue = "inset(0 100% 0 0)";
//   if (status === "active" || status === "completed") {
//     clipPathValue = "inset(0 0% 0 0)";
//   }

//   const clipStyle: React.CSSProperties = {
//     position: "absolute",
//     top: 0,
//     left: 0,
//     width: "100%",
//     height: "100%",
//     color: activeColor?.color,
//     whiteSpace: "nowrap",
//     transitionProperty: "clip-path",
//     transitionTimingFunction: "linear",
//     transitionDuration:
//       status === "active" ? `${Math.max(0.1, duration)}s` : "0s",
//     clipPath: clipPathValue,
//   };

//   const baseStyle: React.CSSProperties = {
//     position: "relative",
//     display: "inline-block",
//     fontSize: typeof fontSize === "number" ? `${fontSize}px` : fontSize,
//     fontWeight: "bold",
//     color: color?.color,
//     lineHeight: "1.2",
//     whiteSpace: "nowrap",
//   };

//   return (
//     <div style={baseStyle}>
//       {lyr}
//       <div style={clipStyle}>{lyr}</div>
//       <div className="truncate">{vocal}</div>
//     </div>
//   );
// };

// export default LyricsCharacter;
