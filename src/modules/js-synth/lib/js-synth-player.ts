import { fixMidiHeader } from "@/lib/karaoke/ncn";
import { Synthesizer as JsSynthesizer } from "js-synthesizer";
import { MidiData, parseMidi } from "midi-file";

type TickUpdateCallback = (tick: number, bpm: number) => void;
type StateChangeCallback = (isPlaying: boolean) => void;

export class JsSynthPlayerEngine {
  private player: JsSynthesizer;
  private audioContext: AudioContext;
  private intervalId: number | undefined = undefined;

  public currentTick: number = 0;
  public isPlaying: boolean = false;
  public durationTicks: number = 0;
  public midiData: MidiData | undefined = undefined;
  public ticksPerBeat: number = 480;
  public currentBpm: number = 120;

  private tickUpdateListeners: TickUpdateCallback[] = [];
  private stateChangeListeners: StateChangeCallback[] = [];
  private rawMidiFile: File | undefined = undefined;

  constructor(synth: JsSynthesizer, audioContext: AudioContext) {
    this.player = synth;
    this.audioContext = audioContext;
  }

  public addEventListener(
    event: "tickupdate",
    callback: TickUpdateCallback
  ): void;
  public addEventListener(
    event: "statechange",
    callback: StateChangeCallback
  ): void;
  public addEventListener(event: string, callback: any): void {
    if (event === "tickupdate") this.tickUpdateListeners.push(callback);
    else if (event === "statechange") this.stateChangeListeners.push(callback);
  }

  public removeEventListener(
    event: "tickupdate",
    callback: TickUpdateCallback
  ): void;
  public removeEventListener(
    event: "statechange",
    callback: StateChangeCallback
  ): void;
  public removeEventListener(event: string, callback: any): void {
    if (event === "tickupdate")
      this.tickUpdateListeners = this.tickUpdateListeners.filter(
        (cb) => cb !== callback
      );
    else if (event === "statechange")
      this.stateChangeListeners = this.stateChangeListeners.filter(
        (cb) => cb !== callback
      );
  }

  private emitTickUpdate(tick: number, bpm: number) {
    this.tickUpdateListeners.forEach((cb) => cb(tick, bpm));
  }

  private emitStateChange(isPlaying: boolean) {
    this.stateChangeListeners.forEach((cb) => cb(isPlaying));
  }

  private intervalLoop = async () => {
    if (!this.isPlaying) return;

    const [tick, bpm] = await Promise.all([
      this.player.retrievePlayerCurrentTick(),
      this.player.retrievePlayerBpm(),
    ]);

    if (tick !== undefined) {
      this.currentTick = tick;
      if (bpm) this.currentBpm = bpm;
      this.emitTickUpdate(this.currentTick, this.currentBpm);
    }

    if (this.currentTick >= this.durationTicks) {
      if (this.rawMidiFile) {
        this.seek(0);
        await this.loadMidi(this.rawMidiFile);
      }
    }
  };

  public play() {
    if (this.isPlaying || !this.midiData) return;

    this.audioContext.resume();
    this.player.playPlayer();
    this.isPlaying = true;
    this.emitStateChange(true);

    this.intervalId = window.setInterval(this.intervalLoop, 50); // ใช้ setInterval 50ms
  }

  public pause() {
    if (!this.isPlaying) return;
    this.player.stopPlayer();
    this.isPlaying = false;
    this.emitStateChange(false);
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  public stop() {
    this.pause();
    this.seek(0);
  }

  public seek(tick: number) {
    const clampedTick = Math.max(0, Math.min(tick, this.durationTicks));
    this.player.seekPlayer(clampedTick);
    this.currentTick = clampedTick;
    this.player.retrievePlayerBpm().then((bpm) => {
      if (bpm) this.currentBpm = bpm;
      this.emitTickUpdate(clampedTick, this.currentBpm);
    });
  }

  async loadMidi(
    resource: File
  ): Promise<{ durationTicks: number; ppq: number; bpm: number }> {
    this.rawMidiFile = resource;
    const buffer = await this.loadBinaryFromFile(resource);
    let midiData: MidiData, midiBuffer: ArrayBuffer;

    try {
      midiData = parseMidi(new Uint8Array(buffer));
      midiBuffer = buffer;
    } catch (error) {
      const fixed = await fixMidiHeader(resource);
      midiBuffer = await fixed.arrayBuffer();
      midiData = parseMidi(new Uint8Array(midiBuffer));
    }

    this.midiData = midiData;
    this.extractMidiMetadata(midiData);

    let totalTicks = midiData.tracks.reduce(
      (max, track) =>
        Math.max(
          max,
          track.reduce((t, ev) => t + ev.deltaTime, 0)
        ),
      0
    );
    this.durationTicks = totalTicks;

    let initialBpm: number | undefined;
    for (const track of midiData.tracks) {
      for (const event of track) {
        if (event.type === "setTempo" && event.microsecondsPerBeat) {
          initialBpm = 60000000 / event.microsecondsPerBeat;
          break;
        }
      }
      if (initialBpm) break;
    }

    await this.player.resetPlayer();
    await this.player.addSMFDataToPlayer(midiBuffer);
    this.seek(0);

    const bpm = initialBpm ?? (await this.player.retrievePlayerBpm());
    if (initialBpm) {
      this.currentBpm = initialBpm;
    }

    return {
      durationTicks: this.durationTicks,
      ppq: midiData.header.ticksPerBeat ?? 480,
      bpm,
    };
  }

  private extractMidiMetadata(midi: MidiData): void {
    this.ticksPerBeat = midi.header.ticksPerBeat || 480;
    console.log("ticksPerBeat", this.ticksPerBeat);
  }

  private async loadBinaryFromFile(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
}
