import { PlayerRef } from "@/components/ui/player-host";
import { useRef, useEffect } from "react";
import { PlayerControls } from "./useKeyboardControls";
import { create } from "zustand";
import { useTimerStore } from "./useTimerWorker";
import { Virtualizer } from "@tanstack/react-virtual"; // 1. Import Type

interface PlayerSetupState {
  playerControls: PlayerControls | null;
  setPlayerControls: (controls: PlayerControls | null) => void;
  // --- 2. เพิ่ม state สำหรับ virtualizer ---
  rowVirtualizer: Virtualizer<HTMLDivElement, Element> | null;
  setRowVirtualizer: (
    virtualizer: Virtualizer<HTMLDivElement, Element> | null
  ) => void;
}

export const usePlayerSetupStore = create<PlayerSetupState>((set) => ({
  playerControls: null,
  setPlayerControls: (controls) => set({ playerControls: controls }),
  // --- 3. เพิ่ม initial state และ action ---
  rowVirtualizer: null,
  setRowVirtualizer: (virtualizer) => set({ rowVirtualizer: virtualizer }),
}));

export const usePlayerSetup = (
  projectId: string | null,
  rawFile: File | null,
  mode: string | null,
  duration: number | null,
  isPlayerReady: boolean
) => {
  const { setPlayerControls } = usePlayerSetupStore();
  const playerRef = useRef<PlayerRef>(null);
  const timerControls = useTimerStore();

  useEffect(() => {
    setPlayerControls(null);
    timerControls.forceStopTimer();
  }, [projectId, rawFile, timerControls, setPlayerControls]);

  useEffect(() => {
    if (mode) {
      timerControls.forceStopTimer();
    }
  }, [mode, timerControls]);

  useEffect(() => {
    if (mode && playerRef.current && isPlayerReady) {
      setPlayerControls({
        play: () => playerRef.current?.play(),
        pause: () => playerRef.current?.pause(),
        seek: (time) => playerRef.current?.seek(time),
        getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
        isPlaying: () => playerRef.current?.isPlaying() ?? false,
      });
    }
  }, [mode, isPlayerReady, duration, setPlayerControls]);

  return { playerRef, timerControls };
};
