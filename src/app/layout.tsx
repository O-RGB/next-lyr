import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "700"],
  variable: "--font-noto-sans-thai",
});

export const metadata: Metadata = {
  title: "Next Lyrics Editor Demo",
  description: "สร้างและแก้ไขเนื้อเพลง Karaoke Next Lyrics Editor รองรับ NCN",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Next Lyrics Editor Demo",
    description: "สร้างและแก้ไขเนื้อเพลง Karaoke Next Lyrics Editor รองรับ NCN",
    images: [
      {
        url: "/cover.png",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <link rel="icon" href="/favicon.ico" />
        <script src="/js-synthesizer/libfluidsynth-2.4.6.js"></script>
      </head>
      <body className={`${notoSansThai.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
