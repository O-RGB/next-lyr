"use client";

import React, { useRef, useState } from "react";
import { audioEngine } from "@/lib/karaoke-engine/engine";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";

interface AllowSoundProps {
  children?: React.ReactNode;
}

const AllowSound: React.FC<AllowSoundProps> = ({ children }) => {
  const [ended, setEnded] = useState<boolean>(false);
  const [pressed, setPressed] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const locale = useSettingsStore((state) => state.uiLocale);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleClick = async () => {
    if (audioRef.current) {
      const audio = audioRef.current;

      setPressed(true);
      audio.addEventListener("ended", () => {
        void audioEngine.suspend();
        setFadeIn(true);
        setTimeout(() => {
          setEnded(true);
        }, 1000);
      }, { once: true });
      try {
        await audioEngine.resume({ keepAlive: true, startupAudio: audio });
      } catch (error) {
        console.error("Unable to unlock audio:", error);
        setPressed(false);
        return;
      }
    }
  };

  return (
    <>
      {ended ? (
        children
      ) : (
        <div
          className={`flex h-screen w-full items-center justify-center bg-raised transition-opacity duration-1000 ${
            fadeIn ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="text-center">
            {pressed ? (
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="text-4xl font-bold text-foreground tracking-wider">
                  Next Lyrics Editor
                </div>
                <div className="flex items-center gap-2 text-foreground font-medium text-lg">
                  <svg
                    className="animate-spin h-5 w-5 text-foreground"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {text(locale, "กำลังโหลด...", "Loading...")}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="text-3xl font-bold text-foreground mb-4 tracking-wider">
                  Next Lyrics Editor
                </div>
                <div className="relative flex items-center justify-center">
                  <span className="absolute flex h-16 w-16">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-panel opacity-75"></span>
                  </span>
                  <button
                    className="relative w-fit p-4 px-8 flex items-center justify-center rounded-full bg-panel border border-line shadow-md font-medium text-lg text-foreground hover:bg-raised transition-all duration-300 transform hover:scale-105"
                    onClick={handleClick}
                  >
                    {text(locale, "เปิดใช้งานเสียง", "Allow sound")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <audio
        src="/sound/startup.mp3"
        controls={false}
        autoPlay={false}
        ref={audioRef}
      />
      {/* CSS Keyframes for Ping Animation */}
      <style jsx global>{`
        @keyframes ping {
          75%,
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        .animate-ping {
          animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </>
  );
};

export default AllowSound;
