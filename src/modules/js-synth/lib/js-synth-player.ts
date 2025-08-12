// src/modules/js-synth/lib/js-synth-player.ts
import { fixMidiHeader } from "@/lib/karaoke/ncn";
import { Synthesizer as JsSynthesizer } from "js-synthesizer";
import { MidiData, parseMidi } from "midi-file";

type StateChangeCallback = (isPlaying: boolean) => void;

export class JsSynthPlayerEngine {
  private player: JsSynthesizer;
  private audioContext: AudioContext;

  private currentTick: number = 0; // Tick position when paused
  private _isPlaying: boolean = false;

  // vvvvvvvvvv จุดแก้ไข: เพิ่ม State สำหรับคำนวณเวลา vvvvvvvvvv
  private _performanceStartTime: number = 0; // Timestamp from performance.now() when play starts
  private _tickAtPlayStart: number = 0; // The tick value when play() was called
  // ^^^^^^^^^^ สิ้นสุดจุดแก้ไข ^^^^^^^^^^

  public durationTicks: number = 0;
  public midiData: MidiData | undefined = undefined;
  public ticksPerBeat: number = 480;
  public currentBpm: number = 120;

  private stateChangeListeners: StateChangeCallback[] = [];
  private rawMidiFile: File | undefined = undefined;

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

  // vvvvvvvvvv จุดแก้ไข: ฟังก์ชัน play ใหม่ vvvvvvvvvv
  public play() {
    if (this._isPlaying || !this.midiData) return;

    this.audioContext.resume();
    this.player.playPlayer(); // สั่งให้ synthesizer เล่น

    this._isPlaying = true;
    this._performanceStartTime = performance.now(); // บันทึกเวลาที่เริ่มเล่น
    this._tickAtPlayStart = this.currentTick; // บันทึก tick ณ จุดที่เริ่มเล่น

    this.emitStateChange(true);
  }
  // ^^^^^^^^^^ สิ้นสุดจุดแก้ไข ^^^^^^^^^^

  // vvvvvvvvvv จุดแก้ไข: ฟังก์ชัน pause ใหม่ vvvvvvvvvv
  public pause() {
    if (!this._isPlaying) return;

    // คำนวณ tick ที่ผ่านไปตั้งแต่กด play ครั้งล่าสุด
    const elapsedMs = performance.now() - this._performanceStartTime;
    const elapsedSec = elapsedMs / 1000;
    const beatsElapsed = elapsedSec * (this.currentBpm / 60);
    const ticksElapsed = beatsElapsed * this.ticksPerBeat;

    this.player.stopPlayer(); // สั่งให้ synthesizer หยุด
    this._isPlaying = false;
    // อัปเดต currentTick ไปยังตำแหน่งล่าสุดก่อนที่จะหยุด
    this.currentTick = this._tickAtPlayStart + ticksElapsed;

    this.emitStateChange(false);
  }
  // ^^^^^^^^^^ สิ้นสุดจุดแก้ไข ^^^^^^^^^^

  public stop() {
    this.pause();
    this.seek(0);
  }

  public destroy() {
    this.stop();
  }

  // vvvvvvvvvv จุดแก้ไข: ฟังก์ชัน seek ใหม่ vvvvvvvvvv
  public seek(tick: number) {
    const clampedTick = Math.max(0, Math.min(tick, this.durationTicks));
    this.player.seekPlayer(clampedTick);

    this.currentTick = clampedTick;
    this._tickAtPlayStart = clampedTick; // อัปเดต tick เริ่มต้นใหม่
    this._performanceStartTime = performance.now(); // รีเซ็ตเวลาเริ่มต้นใหม่
  }
  // ^^^^^^^^^^ สิ้นสุดจุดแก้ไข ^^^^^^^^^^

  // vvvvvvvvvv จุดแก้ไข: ฟังก์ชัน getCurrentTime ใหม่ (หัวใจหลัก) vvvvvvvvvv
  public getCurrentTime(): number {
    if (!this._isPlaying) {
      return this.currentTick; // ถ้าหยุดอยู่ ให้คืนค่า tick ล่าสุดที่เก็บไว้
    }

    // ถ้ากำลังเล่น, ให้คำนวณ tick ปัจจุบันแบบ real-time
    const elapsedMs = performance.now() - this._performanceStartTime;
    const elapsedSec = elapsedMs / 1000;
    const beatsElapsed = elapsedSec * (this.currentBpm / 60);
    const ticksElapsed = beatsElapsed * this.ticksPerBeat;

    return this._tickAtPlayStart + ticksElapsed;
  }
  // ^^^^^^^^^^ สิ้นสุดจุดแก้ไข ^^^^^^^^^^

  async loadMidi(
    resource: File
  ): Promise<{ durationTicks: number; ppq: number; bpm: number }> {
    this.rawMidiFile = resource;
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

    const bpm = initialBpm ?? 120; // Default to 120 if not found
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
