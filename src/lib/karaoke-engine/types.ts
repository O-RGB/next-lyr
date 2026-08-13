/** Minimal arrangement types used by the legacy lyrics-editor adapter. */

export type TrackId = string;
export type AssetId = string;
export type ClipId = string;

export type TrackKind = "audio" | "midi";

export interface Track {
  id: TrackId;
  kind: TrackKind;
  name: string;
  volume: number;
  pan: number;
  muted: boolean;
  soloed: boolean;
  midiChannel?: number;
}

export interface AudioClip {
  id: ClipId;
  trackId: TrackId;
  assetId: AssetId;
  startSec: number;
  offsetSec: number;
  durationSec: number;
  gain: number;
  fadeInSec: number;
  fadeOutSec: number;
}
