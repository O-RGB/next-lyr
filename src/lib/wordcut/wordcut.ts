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

    // Clean input text
    text = this.cleanText(text);
    const result: string[] = [];
    let buffer = ""; // Use buffer instead of unmatched_text for better control
    let i = 0;
    let count = 0;
    const textLength = text.length;

    while (i < textLength) {
      // Handle spaces - output buffer and skip
      if (/\s/.test(text[i])) {
        if (buffer && buffer.trim()) {
          result.push(buffer);
          buffer = "";
        }
        i++;
        continue;
      }

      let matched = false;

      // Only try to match if we have enough characters left
      if (i + 1 < textLength) {
        const currentPrefix = text.slice(i, i + 2);

        if (currentPrefix in this.prefixDict) {
          // Calculate maximum possible word length at this position
          const maxPossibleLength = Math.min(
            textLength - i,
            this.maxWordLength
          );

          // Try matching words from longest to shortest
          for (let length = maxPossibleLength; length > 1; length--) {
            count++;
            if (length in this.prefixDict[currentPrefix]) {
              const candidate = text.slice(i, i + length);
              if (this.prefixDict[currentPrefix][length].has(candidate)) {
                // Output buffer before adding new word
                if (buffer && buffer.trim()) {
                  result.push(buffer);
                  buffer = "";
                }
                result.push(candidate);
                i += length - 1;
                matched = true;
                break;
              }
            }
          }
        }
      }

      if (!matched) {
        const currentChar = text[i];
        // Only handle actual combining characters
        if (this.combiningChars.has(currentChar) && result.length > 0) {
          // Add combining character to previous word if exists
          result[result.length - 1] = result[result.length - 1] + currentChar;
        } else {
          // Add character to buffer
          buffer += currentChar;
        }
      }

      i++;
    }

    // Add remaining buffer if not empty
    if (buffer && buffer.trim()) {
      result.push(buffer);
    }

    // Final cleanup: remove any empty strings
    const finalResult = result.filter((word) => word.trim());

    console.log(`Total lookup operations: ${count}`);
    return finalResult;
  }
}
