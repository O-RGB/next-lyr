import type { AudioClip, AssetId, ClipId } from "./types";
import { audioEngine } from "./engine";

interface ScheduledClip {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

/** Sample-accurate playback for the editor's single imported audio file. */
class ClipPlayer {
  private readonly decoded = new Map<AssetId, AudioBuffer>();
  private readonly pendingDecode = new Map<AssetId, Promise<AudioBuffer>>();
  private readonly active = new Map<ClipId, ScheduledClip>();
  private blobs = new Map<AssetId, Blob>();
  private blobGeneration = 0;
  private playbackRate = 1;

  setBlobs(blobs: Map<AssetId, Blob>): void {
    this.blobs = blobs;
    this.blobGeneration += 1;
    this.decoded.clear();
    this.pendingDecode.clear();
  }

  setPlaybackRate(rate: number): void {
    this.playbackRate = Math.max(0.25, Math.min(4, rate));
    for (const scheduled of this.active.values()) {
      scheduled.source.playbackRate.setTargetAtTime(
        this.playbackRate,
        audioEngine.currentTime,
        0.01
      );
    }
  }

  async prepare(clips: AudioClip[], positionSec: number): Promise<void> {
    const assetIds = [
      ...new Set(
        clips
          .filter((clip) => clip.startSec + clip.durationSec > positionSec)
          .map((clip) => clip.assetId)
      ),
    ];

    // Serial decoding avoids overlapping decoder scratch buffers on mobile.
    for (let index = 0; index < assetIds.length; index += 1) {
      await this.bufferFor(assetIds[index]);
      if (index + 1 < assetIds.length) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  async playAt(
    clips: AudioClip[],
    positionSec: number,
    audioContextTime: number
  ): Promise<void> {
    const context = audioEngine.ctx;
    if (!context) throw new Error("Audio mixer is not initialized");

    this.releaseAll();
    for (const clip of clips) {
      const clipEnd = clip.startSec + clip.durationSec;
      if (clipEnd <= positionSec) continue;

      const buffer = this.decoded.get(clip.assetId);
      const trackNodes = audioEngine.nodesFor(clip.trackId);
      if (!buffer || !trackNodes) continue;

      const intoClip = Math.max(0, positionSec - clip.startSec);
      const offset = clip.offsetSec + intoClip * this.playbackRate;
      const duration = Math.min(
        (clip.durationSec - intoClip) / this.playbackRate,
        (buffer.duration - offset) / this.playbackRate
      );
      if (duration <= 0 || offset < 0 || offset >= buffer.duration) continue;

      const startAt =
        audioContextTime + Math.max(0, clip.startSec - positionSec) / this.playbackRate;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.playbackRate.value = this.playbackRate;
      source.connect(gain);
      gain.connect(trackNodes.input);
      this.scheduleEnvelope(gain.gain, clip, intoClip, startAt, duration);

      const scheduled: ScheduledClip = { source, gain };
      this.active.set(clip.id, scheduled);
      source.onended = () => this.releaseEnded(clip.id, scheduled);
      source.start(startAt, offset, duration * this.playbackRate);
    }
  }

  releaseAll(): void {
    for (const [clipId, scheduled] of this.active) {
      this.release(clipId, scheduled);
    }
  }

  dispose(): void {
    this.releaseAll();
    this.decoded.clear();
    this.pendingDecode.clear();
    this.blobs.clear();
  }

  private async bufferFor(assetId: AssetId): Promise<AudioBuffer> {
    const cached = this.decoded.get(assetId);
    if (cached) return cached;
    const pending = this.pendingDecode.get(assetId);
    if (pending) return pending;

    const generation = this.blobGeneration;
    const decode = this.decodeAsset(assetId)
      .then((buffer) => {
        if (generation === this.blobGeneration && this.blobs.has(assetId)) {
          this.decoded.set(assetId, buffer);
        }
        return buffer;
      })
      .finally(() => {
        if (generation === this.blobGeneration) {
          this.pendingDecode.delete(assetId);
        }
      });
    this.pendingDecode.set(assetId, decode);
    return decode;
  }

  private async decodeAsset(assetId: AssetId): Promise<AudioBuffer> {
    const context = audioEngine.ctx;
    if (!context) throw new Error("Audio mixer is not initialized");
    const blob = this.blobs.get(assetId);
    if (!blob) throw new Error(`Audio asset ${assetId} is missing`);
    return context.decodeAudioData(await blob.arrayBuffer());
  }

  private scheduleEnvelope(
    gain: AudioParam,
    clip: AudioClip,
    intoClip: number,
    startAt: number,
    duration: number
  ): void {
    const endAt = startAt + duration;
    const fadeInEnd = Math.max(0, clip.fadeInSec);
    const fadeOutStart = Math.max(
      0,
      clip.durationSec - Math.max(0, clip.fadeOutSec)
    );
    const levelAtStart =
      fadeInEnd > 0 && intoClip < fadeInEnd
        ? clip.gain * (intoClip / fadeInEnd)
        : clip.fadeOutSec > 0 && intoClip > fadeOutStart
          ? clip.gain * Math.max(0, (clip.durationSec - intoClip) / clip.fadeOutSec)
          : clip.gain;

    gain.setValueAtTime(0, Math.max(0, startAt - 0.001));
    gain.setValueAtTime(levelAtStart, startAt);
    if (fadeInEnd > intoClip) {
      gain.linearRampToValueAtTime(
        clip.gain,
        Math.min(endAt, startAt + fadeInEnd - intoClip)
      );
    }
    if (clip.fadeOutSec > 0) {
      const fadeOutAt = startAt + Math.max(0, fadeOutStart - intoClip);
      if (fadeOutAt > startAt && fadeOutAt < endAt) {
        gain.setValueAtTime(clip.gain, fadeOutAt);
      }
      gain.linearRampToValueAtTime(0, endAt);
    } else {
      gain.setValueAtTime(0, endAt);
    }
  }

  private release(clipId: ClipId, scheduled: ScheduledClip): void {
    if (this.active.get(clipId) !== scheduled) return;
    scheduled.source.onended = null;
    try {
      scheduled.source.stop();
    } catch {
      // It may have ended naturally.
    }
    scheduled.source.disconnect();
    scheduled.gain.disconnect();
    this.active.delete(clipId);
  }

  private releaseEnded(clipId: ClipId, scheduled: ScheduledClip): void {
    if (this.active.get(clipId) !== scheduled) return;
    scheduled.source.onended = null;
    scheduled.source.disconnect();
    scheduled.gain.disconnect();
    this.active.delete(clipId);
  }
}

export const clipPlayer = new ClipPlayer();
