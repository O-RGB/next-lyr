import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "NextLyricsEditor",
    short_name: "NextLyricsEditor",
    description:
      "สร้างและแก้ไขเนื้อเพลง Karaoke Next Lyrics Editor รองรับ NCN",
    start_url: "/",
    scope: "/",
    display: "fullscreen",
    display_override: ["fullscreen", "standalone"],
    background_color: "#f4f6fa",
    theme_color: "#f4f6fa",
    icons: [
      {
        src: "/images/icon-app.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/lyr192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/lyr512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/lyr1000.png",
        sizes: "1000x1000",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/images/cover.png",
        sizes: "1671x941",
        type: "image/png",
        form_factor: "wide",
        label: "NextLyricsEditor karaoke lyrics editor",
      },
    ],
  };
}
