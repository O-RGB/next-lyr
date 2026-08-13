import type { Track, TrackId } from "./types";

import {
  bindAudioKeepAlive,
  disposeAudioKeepAlive,
  needsAudioKeepAlive,
  pauseAudioKeepAlive,
  playAudioKeepAlive,
} from "./audio-background";

/**
 * One shared Web Audio graph for MIDI and decoded file audio.
 * Keeping both paths on this clock is the important synchronization boundary.
 */
export interface TrackNodes {
  input: GainNode;
  panner: StereoPannerNode;
  gain: GainNode;
}

class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private midiGain: GainNode | null = null;
  private trackDelay: DelayNode | null = null;
  private trackDelaySeconds = 0;
  private masterVolume = 1;
  private mixTracks: Track[] = [];
  private readonly tracks = new Map<TrackId, TrackNodes>();

  get ctx(): AudioContext | null {
    return this.context;
  }

  get isReady(): boolean {
    return this.context !== null && this.context.state === "running";
  }

  get currentTime(): number {
    return this.context?.currentTime ?? 0;
  }

  /**
   * AudioContext time projected from the output clock when the browser
   * exposes it. This is the same clock used by the proven karaoke-web-online
   * timer and is more accurate for a keypress than a worker's wall-clock
   * interpolation alone.
   */
  get exactCurrentTime(): number {
    const context = this.context;
    if (!context) return 0;

    let exact = context.currentTime;
    const timestamp = context.getOutputTimestamp?.();
    if (
      timestamp &&
      timestamp.contextTime !== undefined &&
      timestamp.performanceTime !== undefined &&
      Number.isFinite(timestamp.contextTime) &&
      Number.isFinite(timestamp.performanceTime)
    ) {
      exact = Math.max(
        exact,
        timestamp.contextTime +
          (performance.now() - timestamp.performanceTime) / 1000
      );
    }
    return exact;
  }

  /** Hardware/output delay that remains after the shared presentation point. */
  get hardwareOutputLatencySeconds(): number {
    const context = this.context;
    if (!context) return 0;
    return Math.max(
      0,
      (Number.isFinite(context.baseLatency) ? context.baseLatency : 0) +
        (Number.isFinite(context.outputLatency) ? context.outputLatency : 0)
    );
  }

  async resume(
    options: {
      keepAlive?: boolean;
      startupAudio?: HTMLAudioElement | null;
    } = {}
  ): Promise<AudioContext> {
    if (options.startupAudio) {
      options.startupAudio.volume = 0.5;
      options.startupAudio.currentTime = 0;
      await options.startupAudio.play();
    }

    if (!this.context) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) throw new Error("Web Audio is unavailable in this browser");

      this.context = new Ctor({ latencyHint: "playback" });
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.midiGain = this.context.createGain();
      this.midiGain.connect(this.masterGain);
      this.trackDelay = this.context.createDelay(5);
      this.trackDelay.delayTime.value = this.trackDelaySeconds;
      this.trackDelay.connect(this.masterGain);
      this.masterGain.connect(this.context.destination);
      this.applyMix(this.mixTracks);
    }

    if (this.context.state === "suspended") await this.context.resume();
    if (options.keepAlive && needsAudioKeepAlive()) {
      bindAudioKeepAlive(this.context);
      if (!(await playAudioKeepAlive())) {
        throw new Error("Audio keep-alive could not be started");
      }
    } else {
      pauseAudioKeepAlive();
    }
    return this.context;
  }

  /** Stop every audio render callback while transport is idle. */
  async suspend(): Promise<void> {
    pauseAudioKeepAlive();
    const context = this.context;
    if (!context || context.state !== "running") return;
    try {
      await context.suspend();
    } catch {
      // A concurrent dispose may close the context first.
    }
  }

  get master(): GainNode | null {
    return this.masterGain;
  }

  get midiInput(): GainNode | null {
    return this.midiGain;
  }

  setMasterVolume(value: number): void {
    this.masterVolume = Math.max(0, Math.min(1.2, value));
    if (!this.masterGain || !this.context) return;
    this.masterGain.gain.setTargetAtTime(
      this.masterVolume,
      this.context.currentTime,
      0.01
    );
  }

  setTrackDelay(seconds: number): void {
    this.trackDelaySeconds = Math.max(0, Math.min(5, seconds));
    if (!this.trackDelay || !this.context) return;
    const now = this.context.currentTime;
    this.trackDelay.delayTime.cancelScheduledValues(now);
    this.trackDelay.delayTime.setValueAtTime(this.trackDelaySeconds, now);
  }

  nodesFor(trackId: TrackId): TrackNodes | null {
    if (!this.context || !this.masterGain) return null;
    const existing = this.tracks.get(trackId);
    if (existing) return existing;

    const input = this.context.createGain();
    const panner = this.context.createStereoPanner();
    const gain = this.context.createGain();
    input.connect(panner);
    panner.connect(gain);
    gain.connect(this.trackDelay ?? this.masterGain);
    const nodes = { input, panner, gain };
    this.tracks.set(trackId, nodes);
    return nodes;
  }

  releaseTrack(trackId: TrackId): void {
    const nodes = this.tracks.get(trackId);
    if (!nodes) return;
    nodes.input.disconnect();
    nodes.panner.disconnect();
    nodes.gain.disconnect();
    this.tracks.delete(trackId);
  }

  applyMix(tracks: Track[]): void {
    this.mixTracks = tracks;
    if (!this.context) return;
    const now = this.context.currentTime;
    const anySolo = tracks.some((track) => track.soloed);
    const activeAudioTracks = new Set(
      tracks.filter((track) => track.kind === "audio").map((track) => track.id)
    );

    for (const trackId of this.tracks.keys()) {
      if (!activeAudioTracks.has(trackId)) this.releaseTrack(trackId);
    }

    for (const track of tracks) {
      if (track.kind !== "audio") continue;
      const nodes = this.nodesFor(track.id);
      if (!nodes) continue;
      const audible = anySolo ? track.soloed && !track.muted : !track.muted;
      nodes.gain.gain.setTargetAtTime(
        audible ? Math.max(0, track.volume) : 0,
        now,
        0.015
      );
      nodes.panner.pan.setTargetAtTime(
        Math.max(-1, Math.min(1, track.pan)),
        now,
        0.015
      );
    }
  }

  dispose(): void {
    for (const trackId of [...this.tracks.keys()]) this.releaseTrack(trackId);
    disposeAudioKeepAlive();
    void this.context?.close();
    this.context = null;
    this.masterGain = null;
    this.midiGain = null;
    this.trackDelay?.disconnect();
    this.trackDelay = null;
    this.mixTracks = [];
  }
}

export const audioEngine = new AudioEngine();
