"use client";

import React, { useLayoutEffect, useRef, useState } from "react";

interface AllowSoundProps {
  children?: React.ReactNode;
}

const AllowSound: React.FC<AllowSoundProps> = ({ children }) => {
  const [ended, setEnded] = useState<boolean>(false);
  const [pressed, setPressed] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioLoopRef = useRef<HTMLAudioElement>(null);

  const requestMIDIAccess = async () => {
    if (navigator.requestMIDIAccess) {
      try {
        const access = await navigator.requestMIDIAccess();
        return access;
      } catch (error) {
        console.error("Error accessing MIDI devices:", error);
        return null;
      }
    } else {
      console.log("Web MIDI API is not supported in this browser.");
      return null;
    }
  };

  const handleClick = () => {
    if (audioRef.current && audioLoopRef.current) {
      const audio = audioRef.current;
      const audioLoop = audioLoopRef.current;

      setPressed(true);
      audio.volume = 0.5;
      audioLoop.volume = 0.2;
      audio.play();
      audioLoop.play();
      audio.addEventListener("ended", () => {
        setFadeIn(true);
        setTimeout(() => {
          setEnded(true);
        }, 1000);
      });
    }
  };

  useLayoutEffect(() => {
    requestMIDIAccess();
  }, []);

  return (
    <>
      {ended ? (
        children
      ) : (
        <div
          className={`flex h-screen w-full items-center justify-center bg-gray-100 transition-opacity duration-1000 ${
            fadeIn ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="text-center">
            {pressed ? (
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="text-4xl font-bold text-gray-700 tracking-wider">
                  Next Lyrics Editor
                </div>
                <div className="flex items-center gap-2 text-gray-600 font-medium text-lg">
                  <svg
                    className="animate-spin h-5 w-5 text-gray-600"
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
                  Loading...
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="text-3xl font-bold text-gray-700 mb-4 tracking-wider">
                  Next Lyrics Editor
                </div>
                <div className="relative flex items-center justify-center">
                  <span className="absolute flex h-16 w-16">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  </span>
                  <button
                    className="relative w-fit p-4 px-8 flex items-center justify-center rounded-full bg-white border border-gray-300 shadow-md font-medium text-lg text-gray-700 hover:bg-gray-100 transition-all duration-300 transform hover:scale-105"
                    onClick={handleClick}
                  >
                    Allow Sound
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
      <audio
        loop
        src="/sound/allow-sound.mp3"
        controls={false}
        autoPlay={false}
        ref={audioLoopRef}
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
