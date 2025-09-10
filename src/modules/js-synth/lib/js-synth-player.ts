import { useTimerStore } from "@/hooks/useTimerWorker";
import { parseMidi } from "@/lib/karaoke/midi/reader";
import { IMidiParseResult } from "@/lib/karaoke/midi/types";
import { fixMidiHeader } from "@/lib/karaoke/ncn";
import { Synthesizer as JsSynthesizer } from "js-synthesizer";

type StateChangeCallback = (isPlaying: boolean) => void;

export class JsSynthPlayerEngine {
  private player: JsSynthesizer;
  private audioContext: AudioContext;

  private _isPlaying: boolean = false;
  private midiData: IMidiParseResult | undefined = undefined;
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
    if (this._isPlaying) return;

    this.audioContext.resume();
    this.player.playPlayer();

    this._isPlaying = true;

    this.emitStateChange(true);
  }

  public pause() {
    if (!this._isPlaying) return;

    this.player.stopPlayer();
    this._isPlaying = false;

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
    if (!this.midiData) return;
    const clampedTick = Math.max(0, Math.min(tick, this.midiData?.duration));
    this.player.seekPlayer(clampedTick);
  }

  async loadMidi(resource: File): Promise<IMidiParseResult> {
    this.stop();
    const buffer = await resource.arrayBuffer();
    let midiData: IMidiParseResult;
    let midiBuffer: ArrayBuffer;

    try {
      midiData = await parseMidi(buffer);
      midiBuffer = buffer;
    } catch (error) {
      const fixed = await fixMidiHeader(resource);
      midiBuffer = await fixed.arrayBuffer();
      midiData = await parseMidi(midiBuffer);
    }

    // const { updatePpq } = useTimerStore.getState();
    // updatePpq(midiData.ticksPerBeat);

    await this.player.resetPlayer();
    await this.player.addSMFDataToPlayer(midiBuffer);
    this.seek(0);

    this.midiData = midiData;
    return midiData;
  }
}
