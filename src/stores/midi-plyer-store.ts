import { JsSynthEngine } from "@/modules/js-synth/js-synth-engine";
import { TempoUI } from "@/modules/js-synth/types/js-synth.type";
import { MidiData } from "midi-file";
import { create } from "zustand";

interface MidiPlayerStore {
  synth?: JsSynthEngine;
  isPlay?: boolean;
  midiPlaying?: MidiData;
  midiFileNamePlaying?: string;
  tick?: number;
  totalTicks?: number;
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
  midiFileNamePlaying: undefined,
  tick: 0,
  intervalId: undefined,
  midiTempo: {
    count: 0,
    tempo: -1,
  },
  totalTicks: 0,
  measure: 0,
  beat: 0,
  setSynth: (synth: JsSynthEngine) => set({ synth }),

  loadMidi: async (file: File) => {
    const midiData = await get().synth?.player?.loadMidi(file);

    set({ midiPlaying: midiData, midiFileNamePlaying: file.name });
    get().stop();

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
    set({ isPlay: false });
    clearInterval(get().intervalId);
    set({ intervalId: undefined });
    get().synth?.player?.pause();
    get().synth?.synth?.stopPlayer();
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
      const totalTicks = await get().synth?.player?.getTotalTicks();
      if (test?.measure)
        set({ measure: test?.measure, beat: test?.beat, tick, totalTicks });
    }, 50);

    set({ intervalId });
  },
}));

export default useMidiPlayerStore;
