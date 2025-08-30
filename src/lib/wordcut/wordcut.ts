export class ThaiWordDict {
  private prefixDict: { [key: string]: { [key: number]: Set<string> } };
  private maxWordLength: number;
  private combiningChars: Set<string>;

  constructor() {
    this.prefixDict = {};
    this.maxWordLength = 0;
    // Only include actual combining characters (tone marks and above vowels)
    this.combiningChars = new Set(["่", "้", "๊", "๋", "์"]);
  }

  prepareWordDict(words: string[]): {
    [key: string]: { [key: number]: Set<string> };
  } {
    // Reset dictionary
    this.prefixDict = {};
    this.maxWordLength = 0;

    // Build prefix dictionary using Sets for O(1) lookup
    for (const word of words) {
      // Skip empty words or single characters
      if (word.trim().length < 2) {
        continue;
      }

      const prefix = word.slice(0, 2);
      if (!(prefix in this.prefixDict)) {
        this.prefixDict[prefix] = {};
      }

      // Group words by length for faster matching
      const wordLen = word.length;
      if (!(wordLen in this.prefixDict[prefix])) {
        this.prefixDict[prefix][wordLen] = new Set();
      }
      this.prefixDict[prefix][wordLen].add(word);

      // Track maximum word length for optimization
      this.maxWordLength = Math.max(this.maxWordLength, wordLen);
    }

    return this.prefixDict;
  }

  private cleanText(text: string): string {
    // Replace multiple spaces with single space
    return text.split(/\s+/).join(" ");
  }

  segmentText(text: string): string[] {
    if (Object.keys(this.prefixDict).length === 0) {
      throw new Error(
        "Dictionary not prepared. Please call prepareWordDict first."
      );
    }

    text = this.cleanText(text);
    const result: string[] = [];
    let buffer = "";
    let i = 0;
    const textLength = text.length;

    while (i < textLength) {
      if (/\s/.test(text[i])) {
        if (buffer) {
          result.push(buffer);
          buffer = "";
        }
        i++;
        continue;
      }

      let longestMatch = "";
      if (i + 1 < textLength) {
        const currentPrefix = text.slice(i, i + 2);
        if (currentPrefix in this.prefixDict) {
          const maxPossibleLength = Math.min(
            textLength - i,
            this.maxWordLength
          );
          for (let length = 2; length <= maxPossibleLength; length++) {
            if (length in this.prefixDict[currentPrefix]) {
              const candidate = text.slice(i, i + length);
              if (this.prefixDict[currentPrefix][length].has(candidate)) {
                longestMatch = candidate;
              }
            }
          }
        }
      }

      if (longestMatch) {
        if (buffer) {
          result.push(buffer);
          buffer = "";
        }
        result.push(longestMatch);
        i += longestMatch.length;
      } else {
        const currentChar = text[i];
        if (
          this.combiningChars.has(currentChar) &&
          result.length > 0 &&
          !buffer
        ) {
          result[result.length - 1] += currentChar;
        } else {
          buffer += currentChar;
        }
        i++;
      }
    }

    if (buffer) {
      result.push(buffer);
    }

    return result.filter((word) => word.trim());
  }
}
