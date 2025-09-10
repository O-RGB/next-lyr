import { loadWords } from "./wordcut";

export const tokenizeThai = async (text: string): Promise<string> => {
  const segmenter = await loadWords();
  const lines = text.split("\n");

  const processedLines = lines.map((line) => {
    const preProcessedLine = line
      .replaceAll("|", " ")
      .replace(/([\u0e00-\u0e7f])([a-zA-Z'’])/g, "$1 $2")
      .replace(/([a-zA-Z'’])([\u0e00-\u0e7f])/g, "$1 $2")
      .replace(/\s+/g, " ")
      .trim();

    const segmentedParts = segmenter.segmentText(preProcessedLine);
    const allWords = segmentedParts
      .flatMap((part) => part.split(/\s+/))
      .filter(Boolean);

    if (allWords.length === 0) return "";

    let result = allWords[0];
    for (let i = 1; i < allWords.length; i++) {
      const prevWord = allWords[i - 1];
      const currentWord = allWords[i];

      const isPrevEnglish = /^[a-zA-Z'’]/.test(prevWord);
      const isCurrentEnglish = /^[a-zA-Z'’]/.test(currentWord);

      if (isPrevEnglish || isCurrentEnglish) {
        result += " | " + currentWord;
      } else {
        result += "|" + currentWord;
      }
    }
    return result;
  });

  return processedLines.join("\n");
};
