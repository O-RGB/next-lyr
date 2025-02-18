"use client";

import React, { useLayoutEffect, useRef, useState } from "react";

interface AllowSoundProps {
  children?: React.ReactNode;
}

const AllowSound: React.FC<AllowSoundProps> = ({ children }) => {
  const [ended, setEnded] = useState<boolean>(false);
  const [pressed, setPressed] = useState(false);
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
        setEnded(true);
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
        <div className="flex h-screen w-screen   items-center justify-center bg-gradient-to-r from-cyan-500 to-blue-500">
          <div className="">
            <div className="text-white text-center">
              ลดการประมวลผล <br /> (เหมาะสำหรับมือถือ)
            </div>
            {pressed ? (
              <div className="flex items-center gap-2 text-white font-bold">
                Karaoke lite Startup
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-fit">
                  <div className="absolute -right-0.5 -top-0.5 w-fit">
                    <span className="relative flex h-3 w-3 ">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                    </span>
                  </div>
                  <button
                    className="w-fit p-3 border flex items-center justify-center rounded-md bg-white"
                    onClick={handleClick}
                  >
                    <div className="px-2">Allow Sound</div>
                  </button>
                </div>
                <span className="pt-1 text-xs text-white">Updated v.1.0.0</span>
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
    </>
  );
};

export default AllowSound;
