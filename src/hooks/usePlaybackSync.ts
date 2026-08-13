import { useEffect } from "react";
import { useKaraokeStore } from "../stores/karaoke-store";
import { PlayerRef } from "@/modules/player";
import { useTimerStore } from "@/timer-worker/store";
import type { LyricWordData } from "@/types/common.type";

interface TimedPlaybackWord {
  word: LyricWordData;
  start: number;
  end: number;
}

function buildPlaybackTimeline(
  lyricsData: LyricWordData[][],
  timingBuffer: ReturnType<typeof useKaraokeStore.getState>["timingBuffer"]
): TimedPlaybackWord[] {
  const timeline: TimedPlaybackWord[] = [];
  for (const line of lyricsData) {
    for (const word of line) {
      const buffered = timingBuffer?.buffer.get(word.index);
      const start = buffered?.start ?? word.start;
      const end = buffered?.end ?? word.end;
      if (start === null || end === null) continue;
      timeline.push({ word, start, end });
    }
  }
  timeline.sort((left, right) => left.start - right.start);
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
    if (timeline[middle].start <= presentationTime) low = middle + 1;
    else high = middle;
  }

  // Normally the last start before the playhead is the active word. Check a
  // few earlier entries too so overlapping/backing-vocal timestamps retain the
  // same first-match behaviour as the old full-array scan.
  for (let index = low - 1; index >= Math.max(0, low - 4); index -= 1) {
    const entry = timeline[index];
    if (presentationTime >= entry.start && presentationTime < entry.end) {
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

    let timeline = buildPlaybackTimeline(
      useKaraokeStore.getState().lyricsData,
      useKaraokeStore.getState().timingBuffer
    );

    const syncPlaybackIndex = (presentationTime: number) => {
      const state = useKaraokeStore.getState();
      if (!state.isPlaying) return;

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
      if (next.presentationValue !== previous.presentationValue) {
        syncPlaybackIndex(next.presentationValue);
      }
    });

    // Playback state and timing buffers can change between timer ticks. Read
    // them imperatively so this runtime component itself never re-renders at
    // the timer cadence.
    const unsubscribeKaraoke = useKaraokeStore.subscribe((next, previous) => {
      if (
        next.lyricsData !== previous.lyricsData ||
        next.timingBuffer !== previous.timingBuffer
      ) {
        timeline = buildPlaybackTimeline(next.lyricsData, next.timingBuffer);
      }
      if (
        next.isPlaying !== previous.isPlaying ||
        next.lyricsData !== previous.lyricsData ||
        next.timingBuffer !== previous.timingBuffer ||
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
