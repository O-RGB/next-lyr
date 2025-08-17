import { fixMidiHeader } from "@/lib/karaoke/ncn";
import { Synthesizer as JsSynthesizer } from "js-synthesizer";
import { MidiData, parseMidi } from "midi-file";

type StateChangeCallback = (isPlaying: boolean) => void;

export class JsSynthPlayerEngine {
  private player: JsSynthesizer;
  private audioContext: AudioContext;

  private currentTick: number = 0;
  private _isPlaying: boolean = false;

  private _performanceStartTime: number = 0;
  private _tickAtPlayStart: number = 0;

  public durationTicks: number = 0;
  public midiData: MidiData | undefined = undefined;
  public ticksPerBeat: number = 480;
  public currentBpm: number = 120;

  private stateChangeListeners: StateChangeCallback[] = [];

  constructor(synth: JsSynthesizer, audioContext: AudioContext) {
    this.player = synth;
    this.audioContext = audioContext;
  }

  public addEventListener(
    event: "statechange",
    callback: StateChangeCallback
  ): void {
    if (event === "statechange") this.stateChangeListeners.push(callback);
  }

  public removeEventListener(
    event: "statechange",
    callback: StateChangeCallback
  ): void {
    if (event === "statechange")
      this.stateChangeListeners = this.stateChangeListeners.filter(
        (cb) => cb !== callback
      );
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

    this._isPlaying = true;
    this._performanceStartTime = performance.now();
    this._tickAtPlayStart = this.currentTick;

    this.emitStateChange(true);
  }

  public pause() {
    if (!this._isPlaying) return;

    const elapsedMs = performance.now() - this._performanceStartTime;
    const elapsedSec = elapsedMs / 1000;
    const beatsElapsed = elapsedSec * (this.currentBpm / 60);
    const ticksElapsed = beatsElapsed * this.ticksPerBeat;

    this.player.stopPlayer();
    this._isPlaying = false;

    this.currentTick = this._tickAtPlayStart + ticksElapsed;

    this.emitStateChange(false);
  }

  public stop() {
    this.pause();
    this.seek(0);
  }

  public destroy() {
    this.stop();
  }

  public seek(tick: number) {
    const clampedTick = Math.max(0, Math.min(tick, this.durationTicks));
    this.player.seekPlayer(clampedTick);

    this.currentTick = clampedTick;
    this._tickAtPlayStart = clampedTick;
    this._performanceStartTime = performance.now();
  }

  public getCurrentTime(): number {
    if (!this._isPlaying) {
      return this.currentTick;
    }

    const elapsedMs = performance.now() - this._performanceStartTime;
    const elapsedSec = elapsedMs / 1000;
    const beatsElapsed = elapsedSec * (this.currentBpm / 60);
    const ticksElapsed = beatsElapsed * this.ticksPerBeat;

    return this._tickAtPlayStart + ticksElapsed;
  }

  async loadMidi(
    resource: File
  ): Promise<{ durationTicks: number; ppq: number; bpm: number }> {
    this.stop();
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

    const bpm = initialBpm ?? 120;
    this.currentBpm = bpm;

    return {
      durationTicks: this.durationTicks,
      ppq: midiData.header.ticksPerBeat ?? 480,
      bpm,
    };
  }

  private extractMidiMetadata(midi: MidiData): void {
    this.ticksPerBeat = midi.header.ticksPerBeat || 480;
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
