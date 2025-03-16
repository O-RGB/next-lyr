import { JsSynthEngine } from "@/modules/js-synth/js-synth-engine";
import { TempoUI } from "@/modules/js-synth/types/js-synth.type";
import { MidiData } from "midi-file";
import { create } from "zustand";

interface MidiPlayerStore {
  synth?: JsSynthEngine;
  isPlay?: boolean;
  midiPlaying?: MidiData;
  tick?: number;
  intervalId?: NodeJS.Timeout;
  midiTempo: TempoUI;
  measure: number;
  beat: number;
  setSynth: (lyrics: JsSynthEngine) => void;
  loadSynth: () => Promise<void>;
  loadMidi?: (file: File) => Promise<MidiData | undefined>;
  play: () => void;
  pause: () => void;
  stop: () => void;
  renderTick: () => void;
}
const useMidiPlayerStore = create<MidiPlayerStore>((set, get) => ({
  synth: undefined,
  isPlay: false,
  midiPlaying: undefined,
  tick: 0,
  intervalId: undefined,
  midiTempo: {
    count: 0,
    tempo: -1,
  },
  measure: 0,
  beat: 0,
  setSynth: (synth: JsSynthEngine) => set({ synth }),

  loadMidi: async (file: File) => {
    const midiData = await get().synth?.player?.loadMidi(file);
    set({ midiPlaying: midiData });
    return midiData;
  },

  loadSynth: async () => {
    const s = new JsSynthEngine();
    await s.startup();
    get().setSynth(s);
  },

  play: () => {
    if (!get().midiPlaying) {
      console.warn("No MIDI file loaded!");
      return;
    }
    get().synth?.player?.play();
    set({ isPlay: true });
    get().renderTick();
  },

  pause: () => {
    get().synth?.player?.pause();
    set({ isPlay: false });
    clearInterval(get().intervalId);
    set({ intervalId: undefined });
  },

  stop: () => {
    get().pause();
    get().synth?.player?.setCurrentTiming(0);
    set({ isPlay: false, midiTempo: undefined, measure: 0 });
  },

  renderTick: () => {
    clearInterval(get().intervalId);

    if (!get().isPlay) return;

    const intervalId = setInterval(async () => {
      const test = await get().synth?.player?.getCurrentBeat();
      const tick = await get().synth?.player?.getCurrentTiming();
      if (test?.measure)
        set({ measure: test?.measure, beat: test?.beat, tick });
    }, 50);

    set({ intervalId });
  },
}));

export default useMidiPlayerStore;
