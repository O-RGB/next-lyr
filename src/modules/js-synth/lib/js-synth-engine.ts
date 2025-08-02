// src/modules/js-synth/lib/js-synth-engine.ts
import { Synthesizer as JsSynthesizer } from "js-synthesizer";
import { JsSynthPlayerEngine } from "./js-synth-player";
import { DEFAULT_SOUND_FONT } from "@/configs/value";

type TickUpdateCallback = (time: number) => void;

export class JsSynthEngine {
  public static instance: JsSynthEngine | undefined = undefined;

  public synth: JsSynthesizer | undefined;
  public audio: AudioContext | undefined;
  public player: JsSynthPlayerEngine | undefined;
  public preset: number[] = [];
  public analysers: AnalyserNode[] = [];
  public soundfontName: string | undefined;
  public soundfontFile: File | undefined;
  public bassLocked: number | undefined = undefined;

  // Worker and Listeners
  private timerWorker: Worker | undefined;
  private tickUpdateListeners: TickUpdateCallback[] = [];

  private constructor() {}

  public static async getInstance(): Promise<JsSynthEngine> {
    if (!JsSynthEngine.instance) {
      const engine = new JsSynthEngine();
      await engine.startup();
      JsSynthEngine.instance = engine;
    }
    return JsSynthEngine.instance!;
  }

  private async startup() {
    const audioContext = new AudioContext();

    const { Synthesizer } = await import("js-synthesizer");
    const synth = new Synthesizer();
    synth.init(audioContext.sampleRate);

    const node = synth.createAudioNode(audioContext, 8192);
    node.connect(audioContext.destination);

    synth.setGain(0.3);

    this.synth = synth;
    this.audio = audioContext;

    // --- Worker Initialization ---
    this.timerWorker = new Worker(
      new URL("/public/worker/timer-worker.ts", import.meta.url)
    );
    this.timerWorker.onmessage = (e: MessageEvent) => {
      if (e.data.type === "tick") {
        this.emitTickUpdate(e.data.time);
      }
    };

    this.player = new JsSynthPlayerEngine(synth, audioContext, this);

    await this.loadDefaultSoundFont();
  }

  // --- Listener Management for Worker Ticks ---
  public addEventListener(
    event: "tickupdate",
    callback: TickUpdateCallback
  ): void {
    if (event === "tickupdate") this.tickUpdateListeners.push(callback);
  }

  public removeEventListener(
    event: "tickupdate",
    callback: TickUpdateCallback
  ): void {
    if (event === "tickupdate") {
      this.tickUpdateListeners = this.tickUpdateListeners.filter(
        (cb) => cb !== callback
      );
    }
  }

  private emitTickUpdate(time: number) {
    this.tickUpdateListeners.forEach((cb) => cb(time));
  }

  // --- Worker Control Methods ---
  public startTimer() {
    this.timerWorker?.postMessage({ command: "start" });
  }

  public stopTimer() {
    this.timerWorker?.postMessage({ command: "stop" });
  }

  public seekTimer(timeInSeconds: number) {
    this.timerWorker?.postMessage({ command: "seek", value: timeInSeconds });
  }

  public playBeep(isFirstBeat: boolean = false) {
    if (!this.audio) {
      return;
    }
    const osc = this.audio.createOscillator();
    const gain = this.audio.createGain();

    const frequency = isFirstBeat ? 880.0 : 440.0;
    osc.frequency.setValueAtTime(frequency, this.audio.currentTime);
    osc.type = "sine";

    gain.gain.setValueAtTime(0.2, this.audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      this.audio.currentTime + 0.08
    );

    osc.connect(gain);
    gain.connect(this.audio.destination);

    osc.start(this.audio.currentTime);
    osc.stop(this.audio.currentTime + 0.1);
  }

  async loadPresetSoundFont(sfId?: number) {
    if (!sfId) {
      return [];
    }
    this.synth?.getSFontObject(sfId)?.getPresetIterable();
  }

  async loadDefaultSoundFont() {
    let arraybuffer: ArrayBuffer | undefined = undefined;
    if (this.soundfontFile) {
      arraybuffer = await this.soundfontFile.arrayBuffer();
    } else {
      const res = await fetch(DEFAULT_SOUND_FONT);
      arraybuffer = await res.arrayBuffer();

      const blob = new Blob([arraybuffer], {
        type: "application/octet-stream",
      });
      const fileBlob = new File([blob], "soundfont.sf2", {
        type: "application/octet-stream",
      });
      this.soundfontFile = fileBlob;
    }

    const sfId = await this.synth?.loadSFont(arraybuffer);
    this.soundfontName = "Default Soundfont sf2";

    this.loadPresetSoundFont(sfId);
  }

  async setSoundFont(file: File) {
    const bf = await file.arrayBuffer();
    try {
      const sfId = await this.synth?.loadSFont(bf);
      this.soundfontName = file.name;
      this.loadPresetSoundFont(sfId);
      return true;
    } catch (error) {
      return false;
    }
  }
}
