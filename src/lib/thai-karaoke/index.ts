export class ThaiKaraoke {
  private static instance: ThaiKaraoke;

  private consMap: Record<string, string> = {
    ก: "k",
    ข: "kh",
    ฃ: "kh",
    ค: "kh",
    ฅ: "kh",
    ฆ: "kh",
    ง: "ng",
    จ: "ch",
    ฉ: "ch",
    ช: "ch",
    ซ: "s",
    ฌ: "ch",
    ญ: "y",
    ฎ: "d",
    ฏ: "t",
    ฐ: "th",
    ฑ: "th",
    ฒ: "th",
    ด: "d",
    ต: "t",
    ถ: "th",
    ท: "th",
    ธ: "th",
    น: "n",
    บ: "b",
    ป: "p",
    ผ: "ph",
    ฝ: "f",
    พ: "ph",
    ฟ: "f",
    ภ: "ph",
    ม: "m",
    ย: "y",
    ร: "r",
    ล: "l",
    ว: "w",
    ศ: "s",
    ษ: "s",
    ส: "s",
    ห: "h",
    ฮ: "h",
    อ: "",
    ฬ: "l",
  };

  private vowelPatterns = [
    { thai: "เ◌ียว", rom: "iao" },
    { thai: "เ◌ือย", rom: "ueai" },
    { thai: "◌ัวะ", rom: "ua" },
    { thai: "◌วา", rom: "ua" },
    { thai: "เ◌ียะ", rom: "ia" },
    { thai: "เ◌ีย", rom: "ia" },
    { thai: "เ◌ือ", rom: "uea" },
    { thai: "◌ัว", rom: "ua" },
    { thai: "เ◌าะ", rom: "o" },
    { thai: "◌อย", rom: "oi" },
    { thai: "โ◌ะ", rom: "o" },
    { thai: "เ◌อะ", rom: "oe" },
    { thai: "เ◌อ", rom: "oe" },
    { thai: "เ◌ิ", rom: "oei" },
    { thai: "เ◌ะ", rom: "e" },
    { thai: "แ◌ะ", rom: "ae" },
    { thai: "◌ะ", rom: "a" },
    { thai: "◌า", rom: "a" },
    { thai: "◌ิ", rom: "i" },
    { thai: "◌ี", rom: "i" },
    { thai: "◌ึ", rom: "eu" },
    { thai: "◌ื", rom: "eu" },
    { thai: "◌ุ", rom: "u" },
    { thai: "◌ู", rom: "u" },
    { thai: "◌ำ", rom: "am" },
    { thai: "◌ๅ", rom: "a" },
    { thai: "เ◌", rom: "e" },
    { thai: "แ◌", rom: "ae" },
    { thai: "โ◌", rom: "o" },
    { thai: "ใ◌", rom: "ai" },
    { thai: "ไ◌", rom: "ai" },
    { thai: "◌ั", rom: "a" }, // Added for short vowel ั
    { thai: "เ◌า", rom: "ao" }, // Added for เ + อ
  ];

  private finalMap: Record<string, string> = {
    ก: "k",
    ข: "k",
    ค: "k",
    ฆ: "k",
    ง: "ng",
    น: "n",
    ม: "m",
    ญ: "n",
    ย: "y",
    ว: "w",
    บ: "p",
    ป: "p",
    พ: "p",
    ภ: "p",
    ฝ: "p",
    ฟ: "p",
    ต: "t",
    ด: "t",
    จ: "t",
    ช: "t",
    ซ: "t",
    ท: "t",
    ธ: "t",
    ฐ: "t",
    ฑ: "t",
    ฒ: "t",
    ล: "l",
    ร: "n",
    ฬ: "l",
    ศ: "t",
    ษ: "t",
    ส: "t",
  };

  private isanDict: Record<string, string> = {
    ฮัก: "hak",
    บ่: "bo",
    หยัง: "yang",
    ได๋: "dai",
    แท้: "thae",
    เจ้า: "chao",
    เทื่อ: "thuea",
    จั่ง: "chang",
    คือ: "kue",
    หนอ: "no",
    เด้อ: "doe",
    แน่: "nae",
    เนาะ: "no",
    อยาก: "yak",
    เฮา: "hao",
    หลาย: "lai",
    น้อย: "noi",
    เจอ: "choe",
    สิ: "si",
    จัง: "chang",
    นี่: "ni",
    นั่น: "nan",
    ใด: "dai",
    ม่วน: "muan",
    สบาย: "sabai",
    คิด: "khit",
    ถึง: "thung",
    ใจ: "chai",
    รัก: "rak",
    หวาน: "wan",
    ดอก: "dok",
    คน: "khon",
    มา: "ma",
    ไป: "pai",
    อิจฉา: "it-cha",
    มัน: "man", // Added
    อีก: "ik", // Added
    เอา: "ao", // Added
    โอม: "om", // Added
    เอิ้น: "oen", // Added
  };

  private tones = /[\u0E48-\u0E4B]/g;
  private marks = /[\u0E47\u0E4C-\u0E4E]/g;

  private constructor() {}

  static getInstance(): ThaiKaraoke {
    if (!ThaiKaraoke.instance) {
      ThaiKaraoke.instance = new ThaiKaraoke();
    }
    return ThaiKaraoke.instance;
  }

  private isThaiChar(ch: string): boolean {
    return ch >= "\u0E01" && ch <= "\u0E5B";
  }

  private cleanThai(text: string): string {
    return text.replace(this.tones, "").replace(this.marks, "");
  }

  private segmentWords(text: string): string[] {
    if (typeof Intl !== "undefined" && (Intl as any).Segmenter) {
      const segmenter = new Intl.Segmenter("th", { granularity: "word" });
      const segments = segmenter.segment(text);
      return Array.from(segments).map((s) => s.segment);
    }
    return text.split(/(\s+)/);
  }

  private tryMatchPattern(
    chars: string[],
    startIdx: number,
    pattern: { thai: string; rom: string }
  ) {
    const template = pattern.thai;
    let charIdx = startIdx;
    let consonantIdx = -1;

    for (let i = 0; i < template.length; i++) {
      const p = template[i];
      if (charIdx >= chars.length) return null;

      while (
        charIdx < chars.length &&
        (this.tones.test(chars[charIdx]) || this.marks.test(chars[charIdx]))
      ) {
        charIdx++;
      }
      if (charIdx >= chars.length) return null;

      if (p === "◌") {
        const ch = chars[charIdx];
        if (!this.consMap[ch] && ch !== "อ") return null;
        consonantIdx = charIdx;
        charIdx++;
      } else {
        if (chars[charIdx] !== p) return null;
        charIdx++;
      }
    }

    let result = "";
    if (consonantIdx >= 0 && chars[consonantIdx] !== "อ") {
      result = this.consMap[chars[consonantIdx]] + pattern.rom;
    } else {
      result = pattern.rom;
    }

    return { romanization: result, nextIndex: charIdx };
  }

  private parseSyllable(syl: string): string {
    if (!syl || !this.isThaiChar(syl[0])) return syl;

    const cleaned = this.cleanThai(syl);
    if (this.isanDict[cleaned]) return this.isanDict[cleaned];

    let result = "";
    let i = 0;
    const chars = Array.from(syl);

    while (i < chars.length) {
      const ch = chars[i];
      if (this.tones.test(ch) || this.marks.test(ch)) {
        i++;
        continue;
      }
      if (!this.isThaiChar(ch)) {
        result += ch;
        i++;
        continue;
      }

      let matched = false;
      for (const pattern of this.vowelPatterns) {
        const match = this.tryMatchPattern(chars, i, pattern);
        if (match) {
          result += match.romanization;
          i = match.nextIndex;
          matched = true;
          break;
        }
      }
      if (matched) continue;

      if (ch === "อ" && i + 1 < chars.length) {
        const nextChar = chars[i + 1];
        if (this.vowelPatterns.some((p) => p.thai.startsWith(nextChar))) {
          i++;
          continue;
        }
      }

      if (this.consMap[ch] !== undefined) {
        const cons = this.consMap[ch];
        let isLastInSyllable = i === chars.length - 1;

        if (!isLastInSyllable && i + 1 < chars.length) {
          let j = i + 1;
          while (
            j < chars.length &&
            (this.tones.test(chars[j]) || this.marks.test(chars[j]))
          ) {
            j++;
          }
          if (j < chars.length) {
            const next = chars[j];
            isLastInSyllable =
              !this.isThaiChar(next) || this.consMap[next] !== undefined;
          } else {
            isLastInSyllable = true;
          }
        }

        result += cons;
        if (isLastInSyllable && this.finalMap[ch] && i > 0) {
          result += this.finalMap[ch];
        } else if (isLastInSyllable && !/[aeiou]$/.test(result)) {
          // Only add default vowel if no vowel precedes
          if (!result.match(/[aeiou]/)) {
            result += "a";
          }
        }
        i++;
        continue;
      }
      i++;
    }

    return result || syl;
  }

  public transliterate(input: string): string {
    if (!input) return "";

    const words = this.segmentWords(input);
    const result = words.map((word) => {
      if (/^\s+$/.test(word) || !/[\u0E00-\u0E7F]/.test(word)) return word;
      return this.parseSyllable(word);
    });

    let output = result.join("");
    output = output
      .replace(/([aeiou])\1{2,}/g, "$1$1")
      .replace(/([bcdfghjklmnpqrstvwxyz])\1{2,}/g, "$1")
      .replace(/\s+/g, " ")
      .trim();

    return output;
  }
}
