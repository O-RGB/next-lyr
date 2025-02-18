import { fixMidiHeader } from "@/lib/karaoke/ncn";
import { Synthesizer as JsSynthesizer } from "js-synthesizer";
import { MidiData, parseMidi } from "midi-file";

export class JsSynthPlayerEngine {
  private player: JsSynthesizer | undefined = undefined;
  public paused: boolean = false;
  public isFinished: boolean = false;
  public currentTiming: number = 0;
  public midiData: MidiData | undefined = undefined;
  public duration: number = 0;
  public durationTiming: number = 0;

  constructor(synth: JsSynthesizer) {
    if (!synth) {
      throw "synth Is null";
    }
    this.player = synth;
  }

  play(): void {
    this.player?.playPlayer();
    this.paused = false;
  }
  stop(): void {
    this.player?.resetPlayer();
    this.paused = true;
  }
  pause(): void {
    this.player?.stopPlayer();
    this.paused = true;
  }

  async getCurrentTiming() {
    const currentTick = (await this.player?.retrievePlayerCurrentTick()) ?? 0;
    return currentTick;
  }

  setCurrentTiming(tick: number): void {
    this.player?.seekPlayer(tick);
  }

  async getCurrentTickAndTempo() {
    const _bpm = (await this.player?.retrievePlayerBpm()) || 0;
    const currentTick = (await this.player?.retrievePlayerCurrentTick()) || 0;

    return { tick: currentTick, tempo: _bpm };
  }

  async loadMidi(resource: File) {
    const buffer = await this.loadBinaryFromFile(resource);

    if (buffer) {
      const midiArrayBuffer = new Uint8Array(buffer);

      let MIDI: MidiData | undefined = undefined;
      let MIDIBuffer: ArrayBuffer | undefined = undefined;
      try {
        MIDI = parseMidi(midiArrayBuffer);
        MIDIBuffer = buffer;
      } catch (error) {
        const fixed = await fixMidiHeader(resource);
        const fixArrayBuffer = await fixed.arrayBuffer();
        const fixedBuffer = new Uint8Array(fixArrayBuffer);
        MIDI = parseMidi(fixedBuffer);
        MIDIBuffer = fixArrayBuffer;
      }
      const division = MIDI.header;

      await this.player?.resetPlayer();
      await this.player?.addSMFDataToPlayer(MIDIBuffer);

      return division.ticksPerBeat ?? 0;
    } else {
      return 0;
    }
  }

  private async loadBinaryFromFile(file: File): Promise<ArrayBuffer | null> {
    if (file == null) {
      return null;
    }

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error("Unable to read"));
      reader.readAsArrayBuffer(file);
    });
  }
}
