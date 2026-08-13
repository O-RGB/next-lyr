import { PlayerRef } from "@/modules/player";
import { useRef, useEffect } from "react";
import { create } from "zustand";
import { useTimerStore } from "@/timer-worker/store";
import { StoredFile } from "@/lib/database/db";

interface PlayerSetupState {
  playerControls: PlayerRef | null;
  setPlayerControls: (controls: PlayerRef | null) => void;
}

export const usePlayerSetupStore = create<PlayerSetupState>((set) => ({
  playerControls: null,
  setPlayerControls: (controls) => set({ playerControls: controls }),
}));

export const usePlayerSetup = (
  projectId: string | null,
  storedFile: StoredFile | null,
  mode: string | null,
  duration: number | null,
  isPlayerReady: boolean
) => {
  const { setPlayerControls } = usePlayerSetupStore();
  const playerRef = useRef<PlayerRef>(null);
  const timerControls = useTimerStore.getState();

  useEffect(() => {
    setPlayerControls(null);
    timerControls.forceStopTimer();
  }, [projectId, storedFile, setPlayerControls]);

  useEffect(() => {
    if (mode) {
      timerControls.forceStopTimer();
    }
  }, [mode]);

  useEffect(() => {
    if (mode && playerRef.current && isPlayerReady) {
      setPlayerControls({
        play: () => playerRef.current?.play(),
        pause: () => playerRef.current?.pause(),
        seek: (time) => playerRef.current?.seek(time),
        getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
        isPlaying: () => playerRef.current?.isPlaying() ?? false,
        setPlaybackRate: (rate) => playerRef.current?.setPlaybackRate?.(rate),
        setVolume: (volume) => playerRef.current?.setVolume?.(volume),
      });
    }
  }, [mode, isPlayerReady, setPlayerControls]);

  return { playerRef, timerControls };
};
