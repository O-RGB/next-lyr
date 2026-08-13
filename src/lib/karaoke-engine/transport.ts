import { type AudioClip, type Track } from "./types";

import { pauseAudioKeepAlive } from "./audio-background";
import { clipPlayer } from "./clip-player";
import { audioEngine } from "./engine";
import {
  DEFAULT_MIDI_BUFFER_SIZE,
  midiSynths,
} from "./midi-synth";
function normalizeMidiChannels(channels: number[]): number[] {
  return [...new Set(channels)]
    .filter(
      (channel) =>
        Number.isInteger(channel) && channel >= 0 && channel <= 15
    )
    .sort((left, right) => left - right);
}
import { SeekController } from "./seek-controller";

/**
 * Unified transport.
 *
 * MIDI events, decoded sound tracks and the UI are all armed from one future
 * AudioContext boundary. MIDI itself runs entirely on FluidSynth's sequencer;
 * the worker below only refreshes UI/metronome state and cannot affect notes.
 */

// MIDI events are already queued sample-accurately inside FluidSynth. This
// heartbeat only checks loop/end state and schedules the optional metronome,
// so 10 Hz avoids needless worker/main-thread wakeups without moving notes.
const TICK_MS = 100;
const SCHEDULE_AHEAD_SEC = 0.25;

export type TransportState = "stopped" | "loading" | "playing";

type Listener = (state: TransportState) => void;

class Transport {
  private state: TransportState = "stopped";
  /** Presentation time after MIDI/audio latency matching. */
  private anchorCtx = 0;
  /** Raw boundary used by the timer before presentation latency is removed. */
  private timerAnchorCtx = 0;
  private anchorPos = 0;
  private pausedAt = 0;
  private holdingPosition = false;
  private playbackRate = 1;
  private operationGeneration = 0;

  private timer: Worker | null = null;
  private tracks: Track[] = [];
  private clips: AudioClip[] = [];
  private duration = 0;
  private loop: { from: number; to: number } | null = null;

  private readonly listeners = new Set<Listener>();
  private metronomeOn = false;
  private nextClickBeat = 0;
  private bpm = 120;
  private beatsPerBar = 4;
  private mutedMidiChannels = new Set<number>();
  private readonly seekController = new SeekController(
    (targetSeconds, generation) =>
      this.performPlayingSeek(targetSeconds, generation)
  );

  get playing(): boolean {
    return this.state === "playing";
  }

  /** Raw AudioContext boundary shared with the karaoke-web-online timer. */
  get audioAnchor(): number {
    return this.timerAnchorCtx;
  }

  get position(): number {
    if (this.state !== "playing" || this.holdingPosition) return this.pausedAt;
    const raw = this.rawPosition;
    return Math.max(this.anchorPos, Math.min(raw, this.duration));
  }

  private get rawPosition(): number {
    return (
      (audioEngine.currentTime - this.anchorCtx) * this.playbackRate +
      this.anchorPos
    );
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.state);
  }

  setArrangement(
    tracks: Track[],
    clips: AudioClip[],
    duration: number,
    bpm: number,
    beatsPerBar: number,
    midiBufferSize = DEFAULT_MIDI_BUFFER_SIZE,
    midiMutedChannels: number[] = []
  ): void {
    const bufferChanged = midiSynths.configureBufferSize(midiBufferSize);
    const previousMutedChannels = this.mutedMidiChannels;
    const nextMutedChannels = new Set(
      normalizeMidiChannels(midiMutedChannels)
    );
    const tracksChanged = this.tracks !== tracks;
    const mutedChannelsChanged = !sameNumberSet(
      previousMutedChannels,
      nextMutedChannels
    );
    this.mutedMidiChannels = nextMutedChannels;
    this.tracks = tracks;
    this.clips = clips;
    this.duration = Math.max(duration, 1);
    this.bpm = bpm;
    this.beatsPerBar = beatsPerBar;
    // Clip edits replace the project root many times during a drag but retain
    // the same track array. Do not reschedule every AudioParam and MIDI channel
    // for an arrangement-only change.
    if (tracksChanged) audioEngine.applyMix(tracks);
    if (tracksChanged || mutedChannelsChanged) {
      midiSynths.applyTrackMix(tracks, midiMutedChannels);
    }
    if (bufferChanged && this.state === "playing") {
      this.pausedAt = this.position;
      this.halt();
      return;
    }

    // A channel may already have future CC7/CC10 events queued in FluidSynth.
    // Re-arm only when the config mute set changed, so ordinary mixer sliders
    // do not restart playback while channel mutes remain immune to later MIDI CCs.
    if (
      this.state === "playing" &&
      mutedChannelsChanged
    ) {
      this.seek(this.position);
    }
  }

  setMetronome(enabled: boolean): void {
    this.metronomeOn = enabled;
    this.nextClickBeat = Math.ceil((this.position * this.bpm) / 60);
  }

  setPlaybackRate(value: number): void {
    const next = Math.max(0.25, Math.min(4, value));
    if (next === this.playbackRate) return;
    const current = this.position;
    this.playbackRate = next;
    midiSynths.setPlaybackRate(next);
    clipPlayer.setPlaybackRate(next);

    if (this.state === "playing") {
      this.anchorPos = current;
      this.anchorCtx = audioEngine.currentTime;
      this.pausedAt = current;
      void this.seek(current).catch(() => undefined);
    } else {
      this.pausedAt = current;
    }
  }

  async play(from?: number): Promise<void> {
    if (this.state === "loading" || this.state === "playing") return;

    const operation = ++this.operationGeneration;
    this.seekController.invalidate();
    this.stopTimer();
    midiSynths.panic();
    clipPlayer.releaseAll();
    this.holdingPosition = true;
    this.state = "loading";
    this.emit();

    try {
      await audioEngine.resume({ keepAlive: true });
      await midiSynths.ensureLoaded();

      const requestedStart = from ?? this.pausedAt;
      const start = requestedStart >= this.duration ? 0 : requestedStart;
      this.pausedAt = start;
      await clipPlayer.prepare(this.clips, start);
      if (operation !== this.operationGeneration) return;

      const boundary = await midiSynths.createPlaybackBoundary();
      if (operation !== this.operationGeneration) return;
      await clipPlayer.playAt(
        this.clips,
        start,
        boundary.audioContextTime
      );
      if (operation !== this.operationGeneration) {
        clipPlayer.releaseAll();
        return;
      }

      midiSynths.playAt(start, boundary);
      this.anchorPos = start;
      this.anchorCtx = boundary.presentationAudioTime;
      this.timerAnchorCtx = boundary.audioContextTime;
      this.pausedAt = start;
      this.nextClickBeat = Math.ceil((start * this.bpm) / 60);
      this.holdingPosition = false;
      this.state = "playing";
      this.startTimer();
      this.emit();
      this.tick();
    } catch (error) {
      if (operation === this.operationGeneration) this.halt();
      throw error;
    }
  }

  pause(): void {
    if (this.state !== "playing") return;
    this.pausedAt = this.position;
    this.halt();
  }

  stop(): void {
    this.pausedAt = 0;
    this.halt();
  }

  private halt(): void {
    this.operationGeneration += 1;
    this.seekController.invalidate();
    this.state = "stopped";
    this.holdingPosition = false;
    this.stopTimer();
    pauseAudioKeepAlive();
    midiSynths.panic();
    clipPlayer.releaseAll();
    void audioEngine.suspend();
    this.emit();
  }

  seek(positionSec: number): Promise<void> {
    const clamped = Math.max(0, Math.min(positionSec, this.duration));
    if (this.state !== "playing") {
      this.pausedAt = clamped;
      return Promise.resolve();
    }

    this.pausedAt = clamped;
    this.holdingPosition = true;
    this.stopTimer();
    midiSynths.panic();
    clipPlayer.releaseAll();
    return this.seekController.request(clamped).catch((error) => {
      if (this.state === "playing") this.halt();
      throw error;
    });
  }

  setLoop(range: { from: number; to: number } | null): void {
    this.loop = range && range.to - range.from > 0.05 ? range : null;
  }

  private async performPlayingSeek(
    targetSeconds: number,
    generation: number
  ): Promise<void> {
    const operation = ++this.operationGeneration;
    const isCurrent = () =>
      operation === this.operationGeneration &&
      this.seekController.isCurrent(generation) &&
      this.state === "playing";

    await audioEngine.resume({ keepAlive: true });
    await midiSynths.ensureLoaded();
    await clipPlayer.prepare(this.clips, targetSeconds);
    if (!isCurrent()) return;

    const boundary = await midiSynths.createPlaybackBoundary();
    if (!isCurrent()) return;
    await clipPlayer.playAt(
      this.clips,
      targetSeconds,
      boundary.audioContextTime
    );
    if (!isCurrent()) {
      clipPlayer.releaseAll();
      return;
    }

    midiSynths.playAt(targetSeconds, boundary);
    this.anchorPos = targetSeconds;
    this.anchorCtx = boundary.presentationAudioTime;
    this.timerAnchorCtx = boundary.audioContextTime;
    this.pausedAt = targetSeconds;
    this.nextClickBeat = Math.ceil((targetSeconds * this.bpm) / 60);
    this.holdingPosition = false;
    this.startTimer();
    this.emit();
    this.tick();
  }

  private startTimer(): void {
    if (this.timer) {
      this.timer.postMessage({ type: "start", intervalMs: TICK_MS });
      return;
    }
    const worker = new Worker(
      new URL("./timer.worker.ts", import.meta.url),
      { type: "module", name: "nkml-clock" }
    );
    worker.addEventListener("message", () => this.tick());
    worker.postMessage({ type: "start", intervalMs: TICK_MS });
    this.timer = worker;
  }

  private stopTimer(): void {
    this.timer?.postMessage({ type: "stop" });
  }

  private tick(): void {
    if (this.state !== "playing" || this.holdingPosition) return;

    const ctxNow = audioEngine.currentTime;
    const rawPosition = this.rawPosition;
    const position = this.position;

    if (rawPosition >= this.anchorPos) {
      if (this.loop && rawPosition >= this.loop.to) {
        this.seek(this.loop.from);
        return;
      }
      if (rawPosition >= this.duration) {
        this.pausedAt = this.duration;
        this.halt();
        return;
      }
    }

    if (this.metronomeOn) {
      this.scheduleClicks(position + SCHEDULE_AHEAD_SEC, ctxNow);
    }
  }

  private scheduleClicks(horizonSec: number, ctxNow: number): void {
    const context = audioEngine.ctx;
    const master = audioEngine.master;
    if (!context || !master) return;

    const secondsPerBeat = 60 / this.bpm;
    while (this.nextClickBeat * secondsPerBeat < horizonSec) {
      const beat = this.nextClickBeat;
      const at =
        this.anchorCtx +
        (beat * secondsPerBeat - this.anchorPos) / this.playbackRate;
      if (at > ctxNow) {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.frequency.value = beat % this.beatsPerBar === 0 ? 1600 : 1100;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.25, at + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
        osc.connect(gain);
        gain.connect(master);
        osc.start(at);
        osc.stop(at + 0.05);
      }
      this.nextClickBeat += 1;
    }
  }

  dispose(): void {
    this.halt();
    this.timer?.terminate();
    this.timer = null;
    this.listeners.clear();
  }
}

function sameNumberSet(left: Set<number>, right: Set<number>): boolean {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

export const transport = new Transport();
