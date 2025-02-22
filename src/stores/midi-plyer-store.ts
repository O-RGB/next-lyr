import { JsSynthEngine } from "@/modules/js-synth-engine";
import { create } from "zustand";

interface MidiPlayerStore {
  synth?: JsSynthEngine;
  isPlay?: boolean;
  setSynth: (lyrics: JsSynthEngine) => void;
  loadSynth: () => Promise<void>;
  loadMidi?: (file: File) => Promise<number>;
  play: () => void;
  pause: () => void;
  stop: () => void;
}

const useMidiPlayerStore = create<MidiPlayerStore>((set, get) => ({
  synth: undefined,
  isPlay: false,
  setSynth: (synth: JsSynthEngine) => set({ synth }),
  loadMidi: async (file: File) => {
    const response = await get().synth?.player?.loadMidi(file);
    return response ?? 0;
  },
  loadSynth: async () => {
    const s = new JsSynthEngine();
    await s.startup();
    get().setSynth(s);
  },
  play: () => {
    get().synth?.player?.play();
    set({ isPlay: true });
  },
  pause: () => {
    get().synth?.player?.pause();
    set({ isPlay: false });
  },
  stop: () => {
    get().pause();
    get().synth?.player?.setCurrentTiming(0);
    set({ isPlay: false });
  },
}));

export default useMidiPlayerStore;
