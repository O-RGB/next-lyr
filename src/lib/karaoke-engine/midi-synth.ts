import type {
  ISequencer,
  Synthesizer as FluidSynthesizer,
} from "js-synthesizer";

const MAX_SOUNDFONT_BYTES = 500 * 1024 * 1024;
import type { Track } from "./types";

import { audioEngine } from "./engine";
import { LegacyMidiRenderClock } from "./legacy-midi-render-clock";
import { MidiSequencerScheduler } from "./midi-sequencer-scheduler";
import {
  parseMidiTimeline,
  type MidiTimeline,
  type MidiTimelineEvent,
} from "./midi-timeline";
function normalizeMidiChannels(channels: number[]): number[] {
  return [...new Set(channels)]
    .filter(
      (channel) =>
        Number.isInteger(channel) && channel >= 0 && channel <= 15
    )
    .sort((left, right) => left - right);
}

const FLUIDSYNTH_SCRIPT = "/js-synthesizer/libfluidsynth-2.4.6.js";
const DRUM_CHANNEL = 9;
const FALLBACK_SAMPLE_RATE = 48000;
const NATIVE_AUDIO_QUANTUM = 128;
const START_LEAD_MIN_SECONDS = 0.3;
// Studio prioritises timing and low energy use over FluidSynth's expensive
// studio effects. A typical karaoke arrangement remains comfortably below
// this voice limit, while runaway sustain can no longer consume 256 voices.
const LOW_POWER_POLYPHONY = 64;
const NO_INTERPOLATION = 0;

/** ScriptProcessor frame sizes accepted by the browser audio graph. */
export const MIDI_BUFFER_SIZE_OPTIONS = [
  4096, 8192, 16384,
] as const;
export const DEFAULT_MIDI_BUFFER_SIZE = 16384;

export function normalizeMidiBufferSize(value: number): number {
  return MIDI_BUFFER_SIZE_OPTIONS.reduce((closest, option) =>
    Math.abs(option - value) < Math.abs(closest - value) ? option : closest
  );
}

export function midiBufferDurationSeconds(
  bufferSize: number,
  sampleRate = FALLBACK_SAMPLE_RATE
): number {
  return bufferSize / Math.max(1, sampleRate);
}

export interface MidiPlaybackBoundary {
  /** Raw transport/timer start, before MIDI render and output compensation. */
  audioContextTime: number;
  /** Time at which both MIDI and sound tracks reach the common output graph. */
  presentationAudioTime: number;
  performanceTime: number;
  tickSnapshot: number;
}

declare global {
  interface Window {
    Module?: unknown;
    __nkmlFluidSynthScript?: Promise<void>;
  }
}

type JsSynthesizerModule = typeof import("js-synthesizer");

async function loadFluidSynth(
  jsSynthesizer: JsSynthesizerModule
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("The MIDI engine is only available in a browser");
  }

  if (!window.__nkmlFluidSynthScript) {
    window.__nkmlFluidSynthScript = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${FLUIDSYNTH_SCRIPT}"]`
      );
      const script = existing ?? document.createElement("script");

      const bind = () => {
        try {
          if (!window.Module) {
            throw new Error("FluidSynth WASM module did not initialize");
          }
          jsSynthesizer.Synthesizer.initializeWithFluidSynthModule(
            window.Module
          );
          void jsSynthesizer.Synthesizer.waitForWasmInitialized().then(
            resolve,
            reject
          );
        } catch (error) {
          reject(error);
        }
      };

      if (existing) {
        bind();
        return;
      }

      script.src = FLUIDSYNTH_SCRIPT;
      script.async = true;
      script.onload = bind;
      script.onerror = () =>
        reject(new Error(`Could not load ${FLUIDSYNTH_SCRIPT}`));
      document.head.appendChild(script);
    }).catch((error) => {
      window.__nkmlFluidSynthScript = undefined;
      throw error;
    });
  }

  await window.__nkmlFluidSynthScript;
}

/**
 * FluidSynth engine using the production sequencer architecture from
 * karaoke-web-online: full-file parser -> ISequencer -> render-clock.
 *
 * The built-in SMF player is intentionally not used. Its seek is applied from
 * a later render callback, which lets a stale position escape during rapid
 * seeks and makes the error grow with ScriptProcessor buffer size.
 */
export class MidiSynthPool {
  private synth: FluidSynthesizer | null = null;
  private sequencer: ISequencer | null = null;
  private scheduler: MidiSequencerScheduler | null = null;
  private renderClock: LegacyMidiRenderClock | null = null;
  private audioNode: AudioNode | null = null;
  private soundfontId: number | null = null;
  private midiTimeline: MidiTimeline | null = null;
  /** Keep the IndexedDB-backed Blob, not another full SF2 ArrayBuffer copy. */
  private soundfontBlob: Blob | null = null;
  private tracks: Track[] = [];
  private mutedMidiChannels = new Set<number>();
  private blockedMixerChannels = new Set<number>();
  private fileGeneration = 0;
  private loadedGeneration = -1;
  private filesReady: Promise<void> = Promise.resolve();
  private engineLoadPromise: Promise<void> | null = null;
  private masterVolume = 0.7;
  private bufferSize = DEFAULT_MIDI_BUFFER_SIZE;
  private playbackRate = 1;
  private playbackGeneration = 0;
  private userLatencyOffsetSeconds = 0;

  get loaded(): boolean {
    return (
      this.synth !== null &&
      this.scheduler !== null &&
      this.loadedGeneration === this.fileGeneration
    );
  }

  get configuredBufferSize(): number {
    return this.bufferSize;
  }

  /**
   * The complete MIDI render block represented by the selected frame size.
   * This is exposed for the settings UI; the active timing compensation uses
   * the system portion in the presentation boundary plus hardware latency.
   */
  get timingCompensationSeconds(): number {
    const sampleRate = audioEngine.ctx?.sampleRate ?? FALLBACK_SAMPLE_RATE;
    return midiBufferDurationSeconds(this.bufferSize, sampleRate);
  }

  /** Extra latency of FluidSynth's block over Web Audio's native quantum. */
  get synchronizationLatencySeconds(): number {
    if (!this.midiTimeline) return 0;
    const sampleRate = audioEngine.ctx?.sampleRate ?? FALLBACK_SAMPLE_RATE;
    return Math.max(
      0,
      midiBufferDurationSeconds(this.bufferSize, sampleRate) -
        midiBufferDurationSeconds(NATIVE_AUDIO_QUANTUM, sampleRate)
    );
  }

  /**
   * Delay between the raw timer boundary and what reaches the listener.
   * This is the same `uiTimerLatency` formula used by karaoke-web-online:
   * legacy render block + Web Audio output + the positive user offset.
   */
  get uiTimerLatencySeconds(): number {
    return (
      this.synchronizationLatencySeconds +
      audioEngine.hardwareOutputLatencySeconds +
      Math.max(0, this.userLatencyOffsetSeconds)
    );
  }

  get playbackStartLeadSeconds(): number {
    const sampleRate = audioEngine.ctx?.sampleRate ?? FALLBACK_SAMPLE_RATE;
    return Math.max(
      START_LEAD_MIN_SECONDS,
      this.midiTimeline
        ? midiBufferDurationSeconds(this.bufferSize, sampleRate) + 0.1
        : 0,
      this.uiTimerLatencySeconds + 0.1
    );
  }

  setUserLatencyOffset(milliseconds: number): void {
    this.userLatencyOffsetSeconds = Number.isFinite(milliseconds)
      ? milliseconds / 1000
      : 0;
    this.applySynchronizationDelay();
  }

  configureBufferSize(value: number): boolean {
    const next = normalizeMidiBufferSize(value);
    if (next === this.bufferSize) return false;

    this.playbackGeneration += 1;
    this.bufferSize = next;
    this.loadedGeneration = -1;
    this.disposeRenderer();
    this.applySynchronizationDelay();
    return true;
  }

  /** Read and parse the complete MIDI and SF2 files before playback. */
  async setFiles(
    midi: Blob | undefined,
    soundfont: Blob | undefined
  ): Promise<void> {
    const generation = ++this.fileGeneration;
    this.playbackGeneration += 1;
    this.filesReady = (midi?.arrayBuffer() ?? Promise.resolve(undefined)).then(
      (midiBuffer) => {
        if (generation !== this.fileGeneration) return;
        if (soundfont && soundfont.size > MAX_SOUNDFONT_BYTES) {
          throw new Error("SoundFont files must be 500 MB or smaller");
        }

        this.midiTimeline = midiBuffer ? parseMidiTimeline(midiBuffer) : null;
        this.soundfontBlob = soundfont ?? null;
        this.loadedGeneration = -1;
        this.scheduler?.load(this.midiTimeline);
        this.scheduler?.clear();
        this.synth?.midiAllSoundsOff();
        this.applySynchronizationDelay();
      }
    );
    await this.filesReady;
  }

  /** Initialize FluidSynth, its native sequencer and sample-paired clock. */
  async ensureLoaded(): Promise<void> {
    await this.filesReady;
    if (!this.soundfontBlob) {
      if (!this.midiTimeline) return;
      throw new Error("Import an SF2 SoundFont before playing MIDI");
    }
    if (this.loaded) return;

    if (!this.engineLoadPromise) {
      this.engineLoadPromise = this.loadCurrentGeneration().finally(() => {
        this.engineLoadPromise = null;
      });
    }
    await this.engineLoadPromise;

    // Do not recursively retry here. A large, corrupt or otherwise rejected
    // SF2 must fail once and return control to the UI; automatic recursion can
    // trap the app in an endless loading loop. A later Play or SF2 change can
    // explicitly start a fresh load attempt.
    if (!this.loaded && this.soundfontBlob) {
      throw new Error(
        "The MIDI engine did not finish loading the selected SoundFont"
      );
    }
  }

  private async loadCurrentGeneration(): Promise<void> {
    const generation = this.fileGeneration;
    const soundfontBlob = this.soundfontBlob;
    if (!soundfontBlob) return;

    // `loadSFont` copies bytes into FluidSynth's WASM filesystem. Materialise
    // the Blob only for that call, then let the temporary ArrayBuffer go so a
    // large SF2 is not retained twice for the life of the project.
    const soundfontData = await soundfontBlob.arrayBuffer();
    if (
      generation !== this.fileGeneration ||
      soundfontBlob !== this.soundfontBlob
    ) {
      return;
    }

    const context = audioEngine.ctx ?? (await audioEngine.resume());
    this.applySynchronizationDelay();
    const jsSynthesizer = await import("js-synthesizer");
    await loadFluidSynth(jsSynthesizer);

    if (!this.synth) {
      const synth = new jsSynthesizer.Synthesizer();
      synth.init(context.sampleRate, {
        chorusActive: false,
        initialGain: 0.5,
        midiChannelCount: 16,
        polyphony: LOW_POWER_POLYPHONY,
        reverbActive: false,
      });
      // Nearest-sample interpolation is FluidSynth's cheapest render mode.
      // Pitch/timing are unchanged; only resampling smoothness is reduced.
      synth.setInterpolation(NO_INTERPOLATION);

      const renderClock = new LegacyMidiRenderClock(
        context,
        synth,
        this.bufferSize
      );
      const midiInput = audioEngine.midiInput;
      if (!midiInput) throw new Error("Audio mixer is not initialized");
      renderClock.audioNode.connect(midiInput);

      const sequencer = await jsSynthesizer.Synthesizer.createSequencer();
      sequencer.setTimeScale(1000);
      const synthClientId = await sequencer.registerSynthesizer(synth);
      renderClock.attachSequencer(sequencer);

      this.synth = synth;
      this.sequencer = sequencer;
      this.scheduler = new MidiSequencerScheduler(
        sequencer,
        synthClientId,
        (event) => this.shouldScheduleMidiEvent(event)
      );
      this.scheduler.load(this.midiTimeline);
      this.renderClock = renderClock;
      this.audioNode = renderClock.audioNode;
    }

    const synth = this.synth;
    this.scheduler?.clear();
    synth.midiAllSoundsOff();
    if (this.soundfontId !== null) {
      synth.unloadSFont(this.soundfontId);
      this.soundfontId = null;
    }

    const loadedSoundfontId = await synth.loadSFont(soundfontData);
    if (generation !== this.fileGeneration) {
      synth.unloadSFont(loadedSoundfontId);
      return;
    }
    this.soundfontId = loadedSoundfontId;
    this.resetSynthState();
    this.scheduler?.load(this.midiTimeline);
    this.loadedGeneration = generation;
    this.applyMasterVolume();
    this.applyTrackMix(this.tracks);
  }

  /**
   * Create one future boundary shared by sequencer, AudioBuffer tracks and UI.
   * The fallback mirrors karaoke-web-online when the first render sample has
   * not arrived yet.
   */
  async createPlaybackBoundary(): Promise<MidiPlaybackBoundary> {
    await this.ensureLoaded();
    const context = audioEngine.ctx;
    if (!context) throw new Error("Audio mixer is not initialized");

    const createTimes = () => {
      const nowPerformance = performance.now();
      const audioContextTime =
        audioEngine.exactCurrentTime + this.playbackStartLeadSeconds;
      return {
        audioContextTime,
        presentationAudioTime:
          audioContextTime + this.synchronizationLatencySeconds,
        // Keep the wall-clock and AudioContext boundaries paired from the
        // same sample. The reference engine deliberately does not fold a
        // getOutputTimestamp correction into this wall-clock lead.
        performanceTime:
          nowPerformance + this.playbackStartLeadSeconds * 1000,
      };
    };

    let times = createTimes();
    let tickSnapshot =
      this.renderClock?.getTickAtAudioTime(times.presentationAudioTime) ?? null;

    if (tickSnapshot === null && this.sequencer) {
      const perfBefore = performance.now();
      const rawTick = await this.sequencer.getTick();
      const perfAfter = performance.now();
      const anchorNow = (perfBefore + perfAfter) / 2;
      times = createTimes();
      tickSnapshot =
        rawTick +
        (perfAfter - perfBefore) / 2 +
        (times.performanceTime - anchorNow);
    }

    return { ...times, tickSnapshot: tickSnapshot ?? 0 };
  }

  /** Queue the complete remainder of the MIDI at the agreed render tick. */
  playAt(fromSeconds: number, boundary: MidiPlaybackBoundary): boolean {
    this.playbackGeneration += 1;
    // Non-MIDI transports share this method but have no MIDI timeline. They
    // are valid no-ops; a MIDI timeline without a live renderer is an error
    // and must not allow the UI timer to run silently.
    if (!this.midiTimeline) return true;
    if (!this.synth || !this.scheduler) return false;

    this.scheduler.clear();
    this.synth.midiAllSoundsOff();
    this.synth.midiAllNotesOff();
    this.resetSynthState();
    const scheduled = this.scheduler.scheduleFrom(
      Math.max(0, fromSeconds) * 1000,
      boundary.tickSnapshot,
      this.playbackRate
    );
    this.applyMasterVolume();
    this.applyTrackMix(this.tracks);
    return scheduled;
  }

  setMidiVolume(value: number): void {
    this.masterVolume = value;
    this.applyMasterVolume();
  }

  setPlaybackRate(value: number): void {
    this.playbackRate = Math.max(0.25, Math.min(4, value));
  }

  /** Apply Studio's MIDI mixer to FluidSynth channels. */
  applyTrackMix(tracks: Track[], mutedChannels?: number[]): void {
    this.tracks = tracks;
    if (mutedChannels) {
      this.mutedMidiChannels = new Set(normalizeMidiChannels(mutedChannels));
    }
    const anySolo = tracks.some((track) => track.soloed);
    const channels = new Map<number, Track[]>();

    for (const track of tracks) {
      if (track.kind !== "midi") continue;
      const channel = Math.max(0, Math.min(15, track.midiChannel ?? 0));
      const channelTracks = channels.get(channel) ?? [];
      channelTracks.push(track);
      channels.set(channel, channelTracks);
    }

    const blockedMixerChannels = new Set<number>();
    for (let channel = 0; channel < 16; channel += 1) {
      const channelTracks = channels.get(channel) ?? [];
      if (channelTracks.length === 0 && !this.mutedMidiChannels.has(channel)) {
        continue;
      }
      const audible =
        !this.mutedMidiChannels.has(channel) &&
        (anySolo
          ? channelTracks.some((track) => track.soloed && !track.muted)
          : channelTracks.some((track) => !track.muted));
      if (!audible) blockedMixerChannels.add(channel);
    }
    this.blockedMixerChannels = blockedMixerChannels;

    if (!this.synth) return;

    for (let channel = 0; channel < 16; channel += 1) {
      const channelTracks = channels.get(channel) ?? [];
      if (channelTracks.length === 0 && !this.mutedMidiChannels.has(channel)) continue;

      const mixTrack =
        channelTracks.find((track) => track.soloed && !track.muted) ??
        channelTracks.find((track) => !track.muted) ??
        channelTracks[0];

      const audible =
        !this.mutedMidiChannels.has(channel) &&
        (anySolo
          ? channelTracks.some((track) => track.soloed && !track.muted)
          : channelTracks.some((track) => !track.muted));
      const volume = audible
        ? Math.round(Math.max(0, Math.min(1.2, mixTrack?.volume ?? 1)) * 127)
        : 0;
      const pan = Math.round(
        (Math.max(-1, Math.min(1, mixTrack?.pan ?? 0)) + 1) * 63.5
      );
      this.synth.midiControl(channel, 7, Math.min(127, volume));
      this.synth.midiControl(channel, 10, pan);
    }
  }

  /**
   * MIDI CC7/CC10 events are part of the file, but Studio's mixer must remain
   * authoritative after a seek. In particular, a chased/future CC7 from a
   * non-solo channel must not restore its volume after applyTrackMix muted it.
   */
  private shouldScheduleMidiEvent(event: MidiTimelineEvent): boolean {
    if (
      event.type !== "controlchange" ||
      (event.control !== 7 && event.control !== 10)
    ) {
      return true;
    }
    return !this.blockedMixerChannels.has(event.channel);
  }

  panic(): void {
    this.playbackGeneration += 1;
    this.scheduler?.clear();
    this.synth?.midiAllSoundsOff();
    this.synth?.midiAllNotesOff();
  }

  dispose(): void {
    this.playbackGeneration += 1;
    this.panic();
    this.disposeRenderer();
    this.midiTimeline = null;
    this.soundfontBlob = null;
    this.filesReady = Promise.resolve();
    this.loadedGeneration = -1;
    this.applySynchronizationDelay();
  }

  applySynchronizationDelay(): void {
    audioEngine.setTrackDelay(
      this.synchronizationLatencySeconds +
        Math.max(0, this.userLatencyOffsetSeconds)
    );
  }

  private resetSynthState(): void {
    const synth = this.synth;
    const soundfontId = this.soundfontId;
    if (!synth || soundfontId === null) return;

    synth.midiSystemReset();
    synth.midiSetChannelType(DRUM_CHANNEL, true);
    for (let channel = 0; channel < 16; channel += 1) {
      synth.midiProgramSelect(
        channel,
        soundfontId,
        channel === DRUM_CHANNEL ? 128 : 0,
        0
      );
    }
  }

  private disposeRenderer(): void {
    this.scheduler?.clear();
    this.scheduler = null;
    this.renderClock?.dispose();
    this.renderClock = null;
    this.sequencer?.close();
    this.sequencer = null;
    this.audioNode = null;
    this.synth?.midiAllSoundsOff();
    this.synth?.close();
    this.synth = null;
    this.soundfontId = null;
  }

  private applyMasterVolume(): void {
    const input = audioEngine.midiInput;
    if (!input || !audioEngine.ctx) return;
    input.gain.setTargetAtTime(
      Math.max(0, Math.min(1.2, this.masterVolume)),
      audioEngine.ctx.currentTime,
      0.015
    );
  }
}

export const midiSynths = new MidiSynthPool();
