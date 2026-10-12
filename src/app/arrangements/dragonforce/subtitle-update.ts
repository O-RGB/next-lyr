import type { LyricWordData } from "@/types/common.type";

const translatedText = (line: readonly LyricWordData[]) =>
  line.map(word => word.vocal ?? "").join("").replace(/\s+/g, "");
const textWords = (line: readonly LyricWordData[]) => line.filter(word => word.kind !== "image");
const signature = (line: readonly LyricWordData[]) => JSON.stringify(
  textWords(line).map(word => [word.text, word.at])
);
const reindexLines = (lines: LyricWordData[][]) => {
  let index = 0;
  return lines.map((line, lineIndex) => line.map(word => ({ ...word, index: index++, lineIndex })));
};

/** Update the authored first-block subtitles without touching later user edits. */
export function updateArrangementSubtitles(current: LyricWordData[][], incoming: LyricWordData[][]) {
  const bySignature = new Map(incoming.map(line => [signature(line), line]));
  let updated = 0;
  const lyricsData = current.map(line => {
    const replacement = bySignature.get(signature(line));
    if (!replacement || translatedText(line) !== translatedText(replacement)) return line;
    const currentCaptions = line.filter(word => word.kind !== "image" && word.vocal?.trim());
    const newCaptions = replacement.filter(word => word.kind !== "image" && word.vocal?.trim());
    if (currentCaptions.length !== 1 || newCaptions.length === 0) return line;
    const replacementText = textWords(replacement);
    const currentText = textWords(line);
    if (currentText.every((word, index) => (word.vocal ?? "") === (replacementText[index].vocal ?? ""))) return line;
    let index = 0;
    updated++;
    return line.map(word => word.kind === "image" ? word : { ...word, vocal: replacementText[index++].vocal });
  });
  return { lyricsData, updated };
}

const OGG_PROMOS = [
  { oldText: "Next Karaoke", oldSubtitle: "เน็กซ์คาราโอเกะ", newText: "Live music with OGG" },
  { oldText: "Built for browser performance", oldSubtitle: "สร้างเพื่อพลังการเล่นผ่านเบราว์เซอร์", newText: "Recorded live. Played online." },
  { oldText: "Optimized browser playback", oldSubtitle: "ปรับระบบเพื่อการเล่นผ่านเบราว์เซอร์", newText: "Live OGG backing tracks" },
  { oldText: "Every note. Every frame.", oldSubtitle: "ใส่ใจทุกโน้ตและทุกเฟรม", newText: "Real sound. Browser power." },
];

/** Replace only known instrumental cards in their original display windows. */
export function updateOggPromotion(current: LyricWordData[][], incoming: LyricWordData[][]) {
  const textOf = (line: readonly LyricWordData[]) => textWords(line).map(word => word.text).join("").trim();
  let updated = 0;
  const lines = current.map(line => {
    const choice = OGG_PROMOS.find(promo => promo.oldText === textOf(line));
    if (!choice || translatedText(line) !== choice.oldSubtitle || line.some(word => word.kind === "image" || word.effect)) return line;
    const replacement = incoming.find(candidate => textOf(candidate) === choice.newText &&
      line[0]?.at === candidate[0]?.at && line.at(-1)?.at === candidate.at(-1)?.at);
    if (!replacement) return line;
    updated++;
    return replacement;
  });
  return { lyricsData: updated ? reindexLines(lines) : current, updated };
}

const EMOJI_TEXT: Readonly<Record<string, string>> = {
  "675cc78d7b90af6c58ba81f111d0023ee2ef11b6643b7053440d1e51784e4275": "💪",
  "72cd2b299cb05fcaa45717d5ff5f56aeda046ad6332b624b7d630f0d1f6f36ec": "🌅",
  "56af9d4ab18991fe577e8acc41bbfd04e0c282ab75d3266e8d4341f8d5ce0d10": "❤️",
  "93087fd756194873ca185ccfca0de6b867e7d7fda1e093cfde56f1d6acbc12ec": "💔",
  "1e26cee16c441e44a71589118c4029e36c8006382780a7420a98956fe14eb766": "😔",
  "f5459d291b252bdde0b93737e1152a5316f9f8152c3673e75e8c9ce436165adf": "🤘",
};
const lastTextIndex = (line: readonly LyricWordData[]) => line.findLastIndex(word => word.kind !== "image" && word.text.trim());

/** Attach literal emoji to the original text block; retain its timestamp and effect. */
export function updateArrangementEmoji(current: LyricWordData[][], incoming: LyricWordData[][]) {
  const additions = new Map<string, string>();
  for (const line of incoming) {
    const index = lastTextIndex(line);
    const emoji = Object.values(EMOJI_TEXT).find(value => line[index]?.text.endsWith(value));
    if (!emoji) continue;
    const original = line.map((word, i) => i === index ? { ...word, text: word.text.slice(0, -emoji.length) } : word);
    additions.set(signature(original), emoji);
  }
  let updated = 0;
  const lines = current.map(line => {
    const legacy = line.filter(word => word.kind === "image" && EMOJI_TEXT[word.sticker?.id ?? ""]);
    let next = line;
    const attach = (index: number, emoji: string) => {
      if (index < 0 || next[index].text.trimEnd().endsWith(emoji)) return;
      next = next.map((word, i) => i === index ? { ...word, text: word.text.trimEnd() + emoji } : word);
      updated++;
    };
    for (const image of legacy) {
      const position = next.indexOf(image);
      attach(lastTextIndex(next.slice(0, position)), EMOJI_TEXT[image.sticker!.id]);
      next = next.filter(word => word !== image);
      updated++;
    }
    if (!legacy.length) {
      const emoji = additions.get(signature(line));
      if (emoji) attach(lastTextIndex(next), emoji);
    }
    return next;
  });
  return { lyricsData: updated ? reindexLines(lines) : current, updated };
}
