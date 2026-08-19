import { detectChords } from "./vendor/midi-chord-detect";
import type { ChordSegment, DetectOptions } from "./vendor/midi-chord-detect";

import type { ChordEvent } from "@/lib/karaoke/midi/types";

export interface SuggestedChord extends ChordEvent {
  id: string;
  endTick: number;
  confidence: number;
  bar: number;
  beat: number;
  beatOffset: number;
}

export interface ChordDetectionResult {
  chords: SuggestedChord[];
  overallConfidence: number;
  keyName: string;
  keyMode: "major" | "minor";
  elapsedMs: number;
}

const DEFAULT_OPTIONS: DetectOptions = {
  vocabulary: "extended",
  // The editor supports four levels of subdivision. Let the detector follow
  // quick harmony changes, while its metrical costs still keep normal songs
  // blocky and readable.
  maxChordsPerBar: 4,
  beatSubdivisions: 4,
  onsetGrid: true,
};

export async function detectMidiChords(
  midiBuffer: ArrayBuffer,
  options: DetectOptions = {}
): Promise<ChordDetectionResult> {
  const result = await detectChords(midiBuffer, {
    ...DEFAULT_OPTIONS,
    ...options,
  });

  return {
    chords: result.segments.map(toSuggestedChord),
    overallConfidence: result.overallConfidence,
    keyName: result.key.name,
    keyMode: result.key.mode,
    elapsedMs: result.elapsedMs,
  };
}

function toSuggestedChord(segment: ChordSegment, index: number): SuggestedChord {
  return {
    id: `wasm-${segment.tick}-${index}`,
    chord: segment.chord,
    tick: Math.max(0, Math.round(segment.tick)),
    endTick: Math.max(segment.tick, Math.round(segment.endTick)),
    confidence: Math.max(0, Math.min(1, segment.confidence)),
    bar: segment.bar,
    beat: segment.beat,
    beatOffset: segment.beatOffset,
  };
}
