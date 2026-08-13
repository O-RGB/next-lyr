import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import { Noto_Sans_Thai_Looped } from "next/font/google";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PreferencesBridge } from "@/features/settings/preferences-bridge";

import "./globals.css";

const notoSansThai = Noto_Sans_Thai_Looped({
  subsets: ["thai", "latin"],
  weight: ["400", "700"],
  variable: "--font-noto-sans-thai",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Next Lyrics Editor",
  description: "สร้างและแก้ไขเนื้อเพลง Karaoke Next Lyrics Editor รองรับ NCN",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Next Lyrics Editor",
    description: "สร้างและแก้ไขเนื้อเพลง Karaoke Next Lyrics Editor รองรับ NCN",
    images: [{ url: "/cover.png", width: 1200, height: 630 }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f6fa",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${notoSansThai.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* libfluidsynth must be on `window` before js-synthesizer initialises. */}
        <script src="/js-synthesizer/libfluidsynth-2.4.6.js" async={false} />
      </head>
      <body className="bg-base">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <PreferencesBridge />
          <TooltipProvider delay={350} closeDelay={120}>
            {children}
          </TooltipProvider>
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
