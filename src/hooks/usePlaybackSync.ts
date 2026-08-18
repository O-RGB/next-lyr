import { useEffect } from "react";
import { useKaraokeStore } from "../stores/karaoke-store";
import { PlayerRef } from "@/modules/player";
import { useTimerStore } from "@/timer-worker/store";
import type { LyricWordData } from "@/types/common.type";

interface TimedPlaybackWord {
  word: LyricWordData;
  at: number;
  until: number;
}

// A direct line jump can cross two dense timestamps between timer samples.
// Keep the first requested box perceptible after its true start without
// moving the audio clock or changing its timestamp.
const DIRECT_START_HOLD_SECONDS = 0.18;

function buildPlaybackTimeline(
  lyricsData: LyricWordData[][],
  timingBuffer: ReturnType<typeof useKaraokeStore.getState>["timingBuffer"],
  defaultDuration: number
): TimedPlaybackWord[] {
  const words = lyricsData.flat();
  const starts = words.map((word) => {
    const buffered = timingBuffer?.buffer.get(word.index);
    return buffered !== undefined ? buffered.at : word.at;
  });
  const timeline: TimedPlaybackWord[] = [];

  for (let wordIndex = 0; wordIndex < words.length; wordIndex += 1) {
    const at = starts[wordIndex];
    if (at === null) continue;

    const nextStart = starts
      .slice(wordIndex + 1)
      .find((candidate): candidate is number => candidate !== null);
    timeline.push({
      word: words[wordIndex],
      at,
      until: nextStart ?? at + defaultDuration,
    });
  }
  timeline.sort((left, right) => left.at - right.at);
  return timeline;
}

function findPlaybackWord(
  timeline: TimedPlaybackWord[],
  presentationTime: number
): LyricWordData | null {
  let low = 0;
  let high = timeline.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (timeline[middle].at <= presentationTime) low = middle + 1;
    else high = middle;
  }

  // Normally the last start before the playhead is the active word. Check a
  // few earlier entries too so overlapping/backing-vocal timestamps retain the
  // same first-match behaviour as the old full-array scan.
  for (let index = low - 1; index >= Math.max(0, low - 4); index -= 1) {
    const entry = timeline[index];
    if (presentationTime >= entry.at && presentationTime < entry.until) {
      return entry.word;
    }
  }
  return null;
}

export const usePlaybackSync = (playerControls: PlayerRef | null) => {
  useEffect(() => {
    if (!playerControls) {
      return;
    }

    const initialState = useKaraokeStore.getState();
    let timeline = buildPlaybackTimeline(
      initialState.lyricsData,
      initialState.timingBuffer,
      initialState.mode === "midi"
        ? initialState.playerState.midi?.ticksPerBeat ?? 1
        : 1
    );
    let releasedPlaybackIndex: number | null = null;
    let releasedPlaybackUntilWallTime = 0;

    const syncPlaybackIndex = (presentationTime: number) => {
      const state = useKaraokeStore.getState();
      const presentationRunning =
        useTimerStore.getState().presentationRunning;
      // Keep a keyboard line-jump override alive through transport.loading.
      // The player briefly reports `isPlaying === false` while it prepares the
      // engine; clearing here makes the previous line's last box flash before
      // the selected line starts.
      if (!state.isPlaying) {
        releasedPlaybackIndex = null;
        releasedPlaybackUntilWallTime = 0;
        return;
      }

      // A very dense line can cross the first and second timestamps between
      // two timer samples. Keep the requested first box visible for the first
      // sample after its visual wait ends, then resume normal timeline sync.
      if (releasedPlaybackIndex !== null) {
        const index = releasedPlaybackIndex;
        if (state.playbackIndex !== index) {
          state.actions.setPlaybackIndex(index);
        }
        if (performance.now() < releasedPlaybackUntilWallTime) return;
        releasedPlaybackIndex = null;
        releasedPlaybackUntilWallTime = 0;
      }

      // Keep an explicit navigation target selected while the engine waits
      // for its future audio boundary. The transport itself starts at this
      // exact timestamp; this state no longer represents an earlier pre-roll.
      const visualOverride = state.playbackVisualOverride;
      if (
        visualOverride &&
        (!presentationRunning || presentationTime < visualOverride.until)
      ) {
        if (state.playbackIndex !== visualOverride.index) {
          state.actions.setPlaybackIndex(visualOverride.index);
        }
        return;
      }
      // The source has been armed, but its first sample is still inside the
      // render/output buffer. Keep the selected visual fixed until the same
      // boundary reaches the listener.
      if (!presentationRunning) return;
      if (visualOverride) {
        releasedPlaybackIndex = visualOverride.index;
        releasedPlaybackUntilWallTime =
          performance.now() + DIRECT_START_HOLD_SECONDS * 1000;
        state.actions.setPlaybackVisualOverride(null);
        if (state.playbackIndex !== visualOverride.index) {
          state.actions.setPlaybackIndex(visualOverride.index);
        }
        return;
      }

      const word = findPlaybackWord(timeline, presentationTime);
      const nextPlaybackIndex = word?.index ?? null;

      // A timer tick is high-frequency, but the active word only changes at
      // word boundaries. Avoid notifying the whole editor when the value did
      // not actually change.
      if (state.playbackIndex !== nextPlaybackIndex) {
        state.actions.setPlaybackIndex(nextPlaybackIndex);
      }

      if (
        word &&
        state.selectedLineIndex !== word.lineIndex &&
        state.editingLineIndex === null
      ) {
        state.actions.selectLine(word.lineIndex);
      }
    };

    const unsubscribeTimer = useTimerStore.subscribe((next, previous) => {
      if (
        next.presentationValue !== previous.presentationValue ||
        next.presentationRunning !== previous.presentationRunning
      ) {
        syncPlaybackIndex(next.presentationValue);
      }
    });

    // Playback state and timing buffers can change between timer ticks. Read
    // them imperatively so this runtime component itself never re-renders at
    // the timer cadence.
    const unsubscribeKaraoke = useKaraokeStore.subscribe((next, previous) => {
      if (!next.isPlaying && previous.isPlaying) {
        // Do not leave the last yellow playback box selected after pause. A
        // later Space press deliberately starts from box 1 of the selected
        // line instead of resuming this stale visual position.
        if (next.playbackIndex !== null) {
          next.actions.setPlaybackIndex(null);
        }
        if (next.playbackVisualOverride !== null) {
          next.actions.setPlaybackVisualOverride(null);
        }
      }
      if (
        next.lyricsData !== previous.lyricsData ||
        next.timingBuffer !== previous.timingBuffer
      ) {
        timeline = buildPlaybackTimeline(
          next.lyricsData,
          next.timingBuffer,
          next.mode === "midi" ? next.playerState.midi?.ticksPerBeat ?? 1 : 1
        );
      }
      if (
        next.isPlaying !== previous.isPlaying ||
        next.lyricsData !== previous.lyricsData ||
        next.timingBuffer !== previous.timingBuffer ||
        next.playbackVisualOverride !== previous.playbackVisualOverride ||
        next.correctionIndex !== previous.correctionIndex ||
        next.selectedLineIndex !== previous.selectedLineIndex ||
        next.editingLineIndex !== previous.editingLineIndex
      ) {
        syncPlaybackIndex(useTimerStore.getState().presentationValue);
      }
    });

    syncPlaybackIndex(useTimerStore.getState().presentationValue);

    return () => {
      unsubscribeTimer();
      unsubscribeKaraoke();
    };
  }, [playerControls]);
};
