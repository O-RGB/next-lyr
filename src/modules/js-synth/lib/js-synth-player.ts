// src/modules/js-synth/lib/js-synth-player.ts
import { fixMidiHeader } from "@/lib/karaoke/ncn";
import { Synthesizer as JsSynthesizer } from "js-synthesizer";
import { MidiData, parseMidi } from "midi-file";
import { JsSynthEngine } from "./js-synth-engine";

type TickUpdateCallback = (tick: number, bpm: number) => void;
type StateChangeCallback = (isPlaying: boolean) => void;

export class JsSynthPlayerEngine {
  private player: JsSynthesizer;
  private audioContext: AudioContext;
  private engine: JsSynthEngine;

  public currentTick: number = 0;
  private _isPlaying: boolean = false;
  public durationTicks: number = 0;
  public midiData: MidiData | undefined = undefined;
  public ticksPerBeat: number = 480;
  public currentBpm: number = 120;

  private tickUpdateListeners: TickUpdateCallback[] = [];
  private stateChangeListeners: StateChangeCallback[] = [];
  private rawMidiFile: File | undefined = undefined;

  constructor(
    synth: JsSynthesizer,
    audioContext: AudioContext,
    engine: JsSynthEngine
  ) {
    this.player = synth;
    this.audioContext = audioContext;
    this.engine = engine;

    this.engine.addEventListener("tickupdate", this.handleEngineTick);
  }

  private handleEngineTick = async (timeInSeconds: number) => {
    if (!this.midiData || this.ticksPerBeat === 0) return;

    const secondsPerBeat = 60.0 / this.currentBpm;
    const ticksPerSecond = this.ticksPerBeat / secondsPerBeat;
    this.currentTick = Math.floor(timeInSeconds * ticksPerSecond);

    const bpm = await this.player.retrievePlayerBpm();
    if (bpm) this.currentBpm = bpm;

    this.emitTickUpdate(this.currentTick, this.currentBpm);
  };

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

  public isPlaying(): boolean {
    return this._isPlaying;
  }

  public play() {
    if (this._isPlaying || !this.midiData) return;

    this.audioContext.resume();
    this.player.playPlayer();
    this.engine.startTimer();
    this._isPlaying = true;
    this.emitStateChange(true);
  }

  public pause() {
    if (!this._isPlaying) return;
    this.player.stopPlayer();
    this.engine.stopTimer();
    this._isPlaying = false;
    this.emitStateChange(false);
  }

  public stop() {
    this.pause();
    this.seek(0);
  }

  public destroy() {
    this.engine.removeEventListener("tickupdate", this.handleEngineTick);
    this.stop();

    this.engine.shutdown();
  }

  public seek(tick: number) {
    const clampedTick = Math.max(0, Math.min(tick, this.durationTicks));
    this.player.seekPlayer(clampedTick);
    this.currentTick = clampedTick;

    const secondsPerBeat = 60.0 / this.currentBpm;
    const timeInSeconds = (clampedTick / this.ticksPerBeat) * secondsPerBeat;
    this.engine.seekTimer(timeInSeconds);

    this.player.retrievePlayerBpm().then((bpm) => {
      if (bpm) this.currentBpm = bpm;
      this.emitTickUpdate(clampedTick, this.currentBpm);
    });
  }

  public getCurrentTime(): number {
    return this.currentTick;
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
