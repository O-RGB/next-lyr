// import React, { useEffect, useRef, useState } from "react";
// // import useLyricsStore from "@/stores/player/lyrics-store";
// import { NextFont } from "next/dist/compiled/@next/font";
// import { LyricsColorConfig } from "@/stores/config/types/config.type";
// import useLyricsStoreNew from "@/stores/lyrics/lyrics-store";

// interface CutLyricsProps {
//   display: string[][];
//   fontSize: number | string;
//   font?: NextFont;
//   fixedCharIndex?: number;
//   color: LyricsColorConfig;
//   activeColor: LyricsColorConfig;
//   preview?: boolean;
// }

// const CutLyrics: React.FC<CutLyricsProps> = ({
//   display,
//   fontSize,
//   fixedCharIndex,
//   color,
//   font,
//   activeColor,
//   preview,
// }) => {
//   const containerRef = useRef<HTMLDivElement>(null);
//   const measureRef = useRef<HTMLSpanElement>(null);
//   const [screenWidth, setScreenWidth] = useState(0);
//   const [isTransitioning, setIsTransitioning] = useState(false);
//   const charIndex = useLyricsStoreNew((state) => state.charIndex);
//   const [highlightedWidth, setHighlightedWidth] = useState<number>(0);

//   useEffect(() => {
//     const resizeObserver = new ResizeObserver(() => {
//       setScreenWidth(containerRef.current?.offsetWidth ?? 0);
//     });
//     if (containerRef.current) {
//       resizeObserver.observe(containerRef.current);
//     }
//     return () => resizeObserver.disconnect();
//   }, []);

//   const measureTextWidth = (text: string): number => {
//     if (!measureRef.current) return 0;
//     measureRef.current.textContent = text;
//     return measureRef.current.offsetWidth;
//   };

//   useEffect(() => {
//     if (fixedCharIndex === -1) {
//       setIsTransitioning(false);
//       setHighlightedWidth(0);
//     } else {
//       setIsTransitioning(true);
//       const fullText = display.flat().join("");
//       const highlightedText = fullText.slice(0, charIndex);
//       const highlightedWidth = measureTextWidth(highlightedText);
//       if (preview) {
//         setHighlightedWidth(100);
//       } else {
//         setHighlightedWidth(highlightedWidth);
//       }
//     }
//   }, [!preview ? charIndex : undefined, fixedCharIndex, display, screenWidth]);

//   const renderCharLyrics = () => display.map((data) => data.join(""));

//   const highlightStyle = {
//     width: `${highlightedWidth}px`,
//     transition: `width ${isTransitioning ? "0.35s" : "0.0s"} ease-out`,
//   };

//   const fontType = typeof fontSize;

//   const commonStyles = {
//     display: "inline-block",
//     whiteSpace: "nowrap" as const,
//     overflow: "hidden",
//     textOverflow: "clip",
//     height: "auto",
//     maxHeight: "none",
//     minHeight: "1.2em",
//     lineHeight: "1.5",
//   };

//   useEffect(() => {}, [font]);

//   return (
//     <div
//       className={`${fontType === "string" ? fontSize : ""} relative font-bold `}
//       ref={containerRef}
//       style={{
//         fontSize: fontType === "number" ? `${fontSize}px` : undefined,
//         ...font?.style,
//       }}
//     >
//       <span ref={measureRef} className="absolute opacity-0 whitespace-nowrap" />
//       <div
//         className="font-outline-3 lg:font-outline-4 absolute top-0 left-0"
//         style={{ color: activeColor.color, ...commonStyles }}
//       >
//         {renderCharLyrics()}
//       </div>
//       <div className="relative" style={{ color: color.color, ...commonStyles }}>
//         {renderCharLyrics()}
//       </div>
//       <div
//         className="absolute top-0 left-0 font-outline-3 lg:font-outline-4"
//         style={{
//           ...highlightStyle,
//           color: activeColor.colorBorder,
//           ...commonStyles,
//         }}
//       >
//         {renderCharLyrics()}
//       </div>
//       <div
//         className="absolute top-0 left-0"
//         style={{ ...highlightStyle, color: color.colorBorder, ...commonStyles }}
//       >
//         {renderCharLyrics()}
//       </div>
//     </div>
//   );
// };

// export default CutLyrics;
