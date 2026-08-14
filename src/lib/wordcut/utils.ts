import { loadWords } from "./wordcut";

const THAI_BLOCK = /[\u0e00-\u0e7f]/;

interface TokenizedWord {
  text: string;
  thai: boolean;
}

/**
 * Split only at a Thai/non-Thai script boundary. Non-Thai text is kept as
 * one run here; it is intentionally never sent through the Thai dictionary.
 */
function splitLanguageRuns(token: string): Array<{ text: string; thai: boolean }> {
  const runs: Array<{ text: string; thai: boolean }> = [];
  let current = "";
  let currentIsThai: boolean | null = null;

  for (const character of token) {
    const isThai = THAI_BLOCK.test(character);
    if (currentIsThai !== null && isThai !== currentIsThai) {
      runs.push({ text: current, thai: currentIsThai });
      current = "";
    }
    current += character;
    currentIsThai = isThai;
  }

  if (current) {
    runs.push({ text: current, thai: currentIsThai === true });
  }

  return runs;
}

export const tokenizeThai = async (text: string): Promise<string> => {
  const segmenter = await loadWords();
  const lines = text.split("\n");

  const processedLines = lines.map((line) => {
    const inputTokens = line
      .replaceAll("|", " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const words: TokenizedWord[] = [];

    for (const inputToken of inputTokens) {
      for (const run of splitLanguageRuns(inputToken)) {
        if (!run.text) continue;

        if (!run.thai) {
          // English, Chinese, Lao, Japanese, symbols, etc. are not
          // dictionary-segmented. One space means one token boundary.
          words.push({ text: run.text, thai: false });
          continue;
        }

        const thaiWords = segmenter
          .segmentText(run.text)
          .map((word) => word.trim())
          .filter(Boolean);
        words.push(
          ...thaiWords.map((word) => ({ text: word, thai: true }))
        );
      }
    }

    if (words.length === 0) return "";

    return words
      .map((word, index) => {
        if (index === 0) return word.text;
        const previous = words[index - 1];
        // Thai-to-Thai stays compact. Any boundary touching another
        // language keeps a space before the pipe, matching karaoke-web-online
        // and making the start of the non-Thai run visible.
        return `${previous.thai && word.thai ? "|" : " |"}${word.text}`;
      })
      .join("");
  });

  return processedLines.join("\n");
};
