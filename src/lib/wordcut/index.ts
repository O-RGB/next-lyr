import { DICT_WORDCUT } from "@/configs/value";
import { ThaiWordDict } from "./wordcut";

export const loadWords = async () => {
  const words: string[] = await fetch(DICT_WORDCUT)
    .then((res) => res.json())
    .then((data) => data);

  const segmenter = new ThaiWordDict();
  segmenter.prepareWordDict(words);
  return segmenter;
};
