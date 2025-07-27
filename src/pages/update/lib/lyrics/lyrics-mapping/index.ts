import {
  LyricsRangeProps,
  LyricsKeyProps,
  LyricsPosition,
  LyricsRangeValueProps,
} from "../types";

export class LyricsRangeArray<T> {
  ranges: LyricsRangeProps<T>[] = [];

  constructor() {}

  push(key: LyricsKeyProps, value: T) {
    const tag = this.calculateTag();
    const newRange = { key, value: { value, tag } };

    let low = 0;
    let high = this.ranges.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (this.ranges[mid].key[0] < key[0]) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    this.ranges.splice(low, 0, newRange);
  }

  remove(key: LyricsKeyProps) {
    this.ranges = this.ranges.filter(
      (range) => !(range.key[0] === key[0] && range.key[1] === key[1])
    );
  }

  private calculateTag(): LyricsPosition {
    if (this.ranges.length === 0) return "top";
    const lastTag = this.ranges[this.ranges.length - 1].value.tag;
    return lastTag === "top" ? "bottom" : "top";
  }

  search(
    tick: number
  ): { lyrics: LyricsRangeValueProps<T>; index: number } | undefined {
    if (this.ranges.length === 0) {
      return undefined;
    }

    let left = 0;
    let right = this.ranges.length - 1;
    let bestMatchIndex = -1;

    while (left <= right) {
      const mid = Math.floor(left + (right - left) / 2);
      const [min, max] = this.ranges[mid].key;

      if (tick >= min && tick <= max) {
        return { lyrics: this.ranges[mid].value, index: mid };
      }

      if (min > tick) {
        right = mid - 1;
      } else {
        bestMatchIndex = mid;
        left = mid + 1;
      }
    }

    if (bestMatchIndex !== -1) {
      return {
        lyrics: this.ranges[bestMatchIndex].value,
        index: bestMatchIndex,
      };
    }

    return undefined;
  }

  getNext(tick: number): LyricsRangeValueProps<T> | undefined {
    const result = this.search(tick);

    if (!result) {
      if (this.ranges.length > 0 && tick < this.ranges[0].key[0]) {
        return this.ranges[0].value;
      }
      return undefined;
    }

    const nextIndex = result.index + 1;
    if (nextIndex < this.ranges.length) {
      return this.ranges[nextIndex].value;
    }

    return undefined;
  }

  getByIndex(index: number): LyricsRangeValueProps<T> | undefined {
    if (index >= 0 && index < this.ranges.length) {
      return this.ranges[index].value;
    }
    return undefined;
  }
}
