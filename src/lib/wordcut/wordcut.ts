import { DICT_WORDCUT } from "@/configs/value";

export class ThaiWordDict {
  private static instance: ThaiWordDict | null = null;
  private static wordsLoaded: Promise<string[]> | null = null;
  private prefixDict: { [key: string]: { [key: number]: Set<string> } };
  private maxWordLength: number;
  private combiningChars: Set<string>;
  private vowelChars: Set<string>;
  private toneMarks: Set<string>;

  private constructor() {
    this.prefixDict = {};
    this.maxWordLength = 0;

    // Combining characters (tone marks and above/below vowels)
    this.combiningChars = new Set(["่", "้", "๊", "๋", "์"]);

    // Thai/Lao vowel characters that might appear standalone
    this.vowelChars = new Set([
      "ะ",
      "า",
      "ำ",
      "ิ",
      "ี",
      "ึ",
      "ื",
      "ุ",
      "ู",
      "เ",
      "แ",
      "โ",
      "ใ",
      "ไ",
      "ฤ",
      "ฦ",
      "ๅ",
      "ๆ",
      "็",
      "์",
      "ั",
      "่",
      "้",
      "๊",
      "๋",
    ]);

    this.toneMarks = new Set(["่", "้", "๊", "๋"]);
  }

  // Singleton getInstance method
  public static async getInstance(dictUrl: string): Promise<ThaiWordDict> {
    if (!ThaiWordDict.instance) {
      ThaiWordDict.instance = new ThaiWordDict();
      await ThaiWordDict.instance.loadDictionary(dictUrl);
    }
    return ThaiWordDict.instance;
  }

  // Load dictionary once and cache the result
  private static async fetchWords(dictUrl: string): Promise<string[]> {
    if (!ThaiWordDict.wordsLoaded) {
      ThaiWordDict.wordsLoaded = fetch(dictUrl)
        .then((res) => res.json())
        .then((data) => data as string[]);
    }
    return ThaiWordDict.wordsLoaded;
  }

  // Initialize dictionary with fetched words
  private async loadDictionary(dictUrl: string): Promise<void> {
    const words = await ThaiWordDict.fetchWords(dictUrl);
    this.prepareWordDict(words);
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

  private isStandaloneVowel(segment: string): boolean {
    // Check if the segment is only vowels/tone marks without consonants
    if (segment.length === 0) return false;

    for (const char of segment) {
      // If we find a consonant (not a vowel or tone mark), it's not standalone
      if (!this.vowelChars.has(char) && !this.toneMarks.has(char)) {
        return false;
      }
    }
    return true;
  }

  private mergeWithPrevious(result: string[], currentSegment: string): void {
    if (result.length > 0) {
      // Merge with the previous segment
      result[result.length - 1] += currentSegment;
    } else {
      // If no previous segment, keep as is (shouldn't happen in practice)
      result.push(currentSegment);
    }
  }

  segmentText(text: string): string[] {
    if (Object.keys(this.prefixDict).length === 0) {
      throw new Error(
        "Dictionary not prepared. Please call getInstance first."
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

    // Post-processing: merge standalone vowels with adjacent segments
    const finalResult: string[] = [];

    for (let j = 0; j < result.length; j++) {
      const segment = result[j];

      if (this.isStandaloneVowel(segment)) {
        if (finalResult.length > 0) {
          // Try to merge with previous segment first
          this.mergeWithPrevious(finalResult, segment);
        } else if (j + 1 < result.length) {
          // If no previous segment, merge with next segment
          const nextSegment = result[j + 1];
          finalResult.push(segment + nextSegment);
          j++; // Skip the next segment since we've merged it
        } else {
          // Last segment and standalone, keep as is
          finalResult.push(segment);
        }
      } else {
        finalResult.push(segment);
      }
    }

    return finalResult.filter((word) => word.trim());
  }
}

export const loadWords = async (
  dictUrl: string = DICT_WORDCUT
): Promise<ThaiWordDict> => {
  return ThaiWordDict.getInstance(dictUrl);
};
