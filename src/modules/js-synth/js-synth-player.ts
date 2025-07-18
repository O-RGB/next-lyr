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
  private timeSignature: { numerator: number; denominator: number } = {
    numerator: 4,
    denominator: 4,
  };
  private ticksPerBeat: number = 480;

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

  async getCurrentBPM() {
    const currentBPM = (await this.player?.retrievePlayerBpm()) ?? 0;
    return currentBPM;
  }

  async getTotalTicks() {
    const totalTicks = (await this.player?.retrievePlayerTotalTicks()) ?? 0;
    return totalTicks;
  }

  setCurrentTiming(tick: number): void {
    this.player?.seekPlayer(tick);
  }

  async getCurrentTickAndTempo() {
    const _bpm = (await this.player?.retrievePlayerBpm()) || 0;
    const currentTick = (await this.player?.retrievePlayerCurrentTick()) || 0;
    return { tick: currentTick, tempo: _bpm };
  }

  async getCurrentBeat(): Promise<{ beat: number; measure: number }> {
    const currentTick = (await this.getCurrentTiming()) - 30;

    const denominator = this.timeSignature.denominator;
    const totalBeats = (currentTick / this.ticksPerBeat) * (denominator / 4);

    const beatsPerMeasure = this.timeSignature.numerator;
    const measure = Math.floor(totalBeats / beatsPerMeasure) + 1;
    const beat = Math.floor(totalBeats % beatsPerMeasure) + 1;

    return { beat, measure };
  }

  async getBeatDisplay(): Promise<string> {
    const { beat, measure } = await this.getCurrentBeat();
    return `${measure}:${beat}`;
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

      if (MIDI) {
        this.extractMidiMetadata(MIDI);
      }

      await this.player?.resetPlayer();
      await this.player?.addSMFDataToPlayer(MIDIBuffer);
      await this.getCurrentBeat();
      setTimeout(() => {
        this.player?.seekPlayer(0);
      }, 10);
      return MIDI;
    } else {
      return undefined;
    }
  }

  private extractMidiMetadata(midi: MidiData): void {
    if (midi.header) {
      this.ticksPerBeat = midi.header.ticksPerBeat || 480;
    }

    if (midi.tracks && midi.tracks.length > 0) {
      for (const track of midi.tracks) {
        for (const event of track) {
          if (
            event.type === "timeSignature" &&
            typeof event.numerator === "number" &&
            typeof event.denominator === "number"
          ) {
            this.timeSignature = {
              numerator: event.numerator,
              denominator: event.denominator,
            };
            break;
          }
        }
      }
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

  async startBeatCounter(
    displayCallback: (beatInfo: {
      measure: number;
      beat: number;
      display: string;
    }) => void,
    updateInterval = 50
  ): Promise<number> {
    return window.setInterval(async () => {
      if (!this.paused) {
        const { beat, measure } = await this.getCurrentBeat();
        const display = `${measure}:${beat}`;
        displayCallback({ measure, beat, display });
      }
    }, updateInterval);
  }

  stopBeatCounter(intervalId: number): void {
    clearInterval(intervalId);
  }
}
