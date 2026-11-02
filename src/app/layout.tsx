import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist_Mono } from "next/font/google";
import { Noto_Sans_Thai_Looped } from "next/font/google";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import ConfirmModal from "@/components/common/confirm-modal";
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

const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000"
);

export const metadata: Metadata = {
  metadataBase,
  applicationName: "Lyrio Studio",
  title: "Lyrio Studio — Karaoke Lyrics Editor",
  description: "สร้างและแก้ไขเนื้อเพลง Karaoke Lyrio Studio รองรับ NCN",
  keywords: ["karaoke", "lyrics editor", "Lyrio Studio", "NCN"],
  icons: {
    icon: [
      { url: "/images/favicon.b051ea6945.ico", type: "image/x-icon", sizes: "48x48" },
      { url: "/images/icon-app.b051ea6945.png", type: "image/png", sizes: "512x512" },
      { url: "/images/lyr192.b051ea6945.png", type: "image/png", sizes: "192x192" },
      { url: "/images/lyr512.b051ea6945.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: { url: "/images/favicon.b051ea6945.ico", type: "image/x-icon", sizes: "48x48" },
    apple: { url: "/images/lyr1000.b051ea6945.png", type: "image/png", sizes: "1000x1000" },
  },
  openGraph: {
    title: "Lyrio Studio — Karaoke Lyrics Editor",
    description: "สร้างและแก้ไขเนื้อเพลง Karaoke Lyrio Studio รองรับ NCN",
    type: "website",
    images: [
      {
        url: "/images/cover.png",
        width: 1671,
        height: 941,
        type: "image/png",
        alt: "Lyrio Studio karaoke lyrics editor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lyrio Studio — Karaoke Lyrics Editor",
    description: "สร้างและแก้ไขเนื้อเพลง Karaoke Lyrio Studio รองรับ NCN",
    images: ["/images/cover.png"],
  },
  appleWebApp: {
    capable: true,
    title: "Lyrio Studio",
    statusBarStyle: "black-translucent",
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
      lang="en"
      className={`${notoSansThai.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* libfluidsynth must be on `window` before js-synthesizer initialises. */}
        <Script src="/js-synthesizer/libfluidsynth-2.4.6.js" strategy="beforeInteractive" />
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
          <ConfirmModal />
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
