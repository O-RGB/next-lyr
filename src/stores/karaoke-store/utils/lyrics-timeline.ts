import { ArrayRange, type ISentence, type LyricsKeyProps } from "@/lib/array-range";

/** Visible row order is independent of the smaller set of recorded cues. */
export class LyricsPlaybackTimeline extends ArrayRange<ISentence> {
  private readonly cues = new ArrayRange<ISentence>();
  private readonly positions = new Map<ISentence, number>();

  get firstCueTime() {
    return this.cues.ranges[0]?.key[0] ?? Infinity;
  }

  addLine(key: LyricsKeyProps, value: ISentence, hasTiming: boolean) {
    const index = this.ranges.length;
    this.positions.set(value, index);
    this.ranges.push({ key, value: { value, tag: index % 2 === 0 ? "top" : "bottom" } });
    if (hasTiming) this.cues.push(key, value);
  }

  override search(tick: number) {
    if (!Number.isFinite(tick)) return undefined;
    // Generated character tails can extend past the next line's first word.
    // The latest start cue owns that boundary, even while the old tail overlaps.
    // Otherwise the renderer can finish the upcoming line before making it active.
    let left = 0;
    let right = this.cues.ranges.length;
    while (left < right) {
      const middle = Math.floor((left + right) / 2);
      if (this.cues.ranges[middle].key[0] <= tick) left = middle + 1;
      else right = middle;
    }
    const match = this.cues.ranges[left - 1];
    if (!match) return undefined;
    const index = this.positions.get(match.value.value)!;
    return { lyrics: this.ranges[index].value, index };
  }
}
