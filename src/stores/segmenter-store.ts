import { loadWords } from "@/lib/wordcut";
import { ThaiWordDict } from "@/lib/wordcut/wordcut";
import { create } from "zustand";

interface SegementerStore {
  wordsCut?: ThaiWordDict;
  setWordCut: (wordsCut: ThaiWordDict) => void;
  wordsCutText?: (str: string[]) => string[][];
  loadSegementer: () => void;
}

const useSegementerStore = create<SegementerStore>((set, get) => ({
  wordsCut: undefined,
  setWordCut: (wordsCut: ThaiWordDict) => set({ wordsCut }),
  loadSegementer: () => {
    loadWords().then((word) => {
      get().setWordCut(word);
    });
  },
  wordsCutText: (str: string[]) => {
    const wordsCut = get().wordsCut;
    if (!wordsCut) {
      return [];
    }
    // let sp = str.map((v) => v.split(""));
    return str.map((v) => wordsCut.segmentText(v));
  },
}));

export default useSegementerStore;
