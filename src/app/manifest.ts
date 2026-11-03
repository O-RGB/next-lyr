import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Lyrio Studio",
    short_name: "Lyrio Studio",
    description:
      "สร้างและแก้ไขเนื้อเพลง Karaoke Lyrio Studio รองรับ NCN",
    start_url: "/",
    scope: "/",
    display: "fullscreen",
    display_override: ["fullscreen", "standalone"],
    background_color: "#f4f6fa",
    theme_color: "#f4f6fa",
    icons: [
      {
        src: "/images/icon-app.b051ea6945.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/lyr192.b051ea6945.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/lyr512.b051ea6945.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/lyr1000.b051ea6945.png",
        sizes: "1000x1000",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/favicon.b051ea6945.ico",
        sizes: "48x48",
        type: "image/x-icon",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/images/cover.e5d090ee7c.png",
        sizes: "1774x887",
        type: "image/png",
        form_factor: "wide",
        label: "Lyrio Studio karaoke lyrics editor",
      },
    ],
  };
}
