import pako from "pako";
import { arrayBufferToBase64, base64ToArrayBuffer, stringToTIS620, TIS620ToString } from "../shared/lib";
import { LyricEvent, SongInfo } from "../midi/types";

export function encodeLyricsBase64(
  xmlText: string,
  header = "LyrHdr1"
): string {
  let xmlBytes: Uint8Array;
  let useTIS = true;
  for (let i = 0; i < xmlText.length; i++) {
    const char = xmlText.charCodeAt(i);
    if (char > 127 && (char < 0x0e01 || char > 0x0e5b)) {
      useTIS = false;
      break;
    }
  }
  if (useTIS) {
    xmlBytes = stringToTIS620(xmlText);
  } else {
    xmlBytes = new TextEncoder().encode(xmlText); // UTF-8 fallback
  }
  const compressed = pako.deflate(xmlBytes, { level: 6 });
  return header + arrayBufferToBase64(compressed);
}

// READ
export function decodeTIS620Text(text: string): string {
  if (!text) return "";
  try {
    let hasThaiEncoded = false;
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) >= 0xa1) {
        hasThaiEncoded = true;
        break;
      }
    }
    if (hasThaiEncoded) {
      const bytes = Uint8Array.from(text, (c) => c.charCodeAt(0));
      return TIS620ToString(bytes);
    }
    return text;
  } catch {
    return text;
  }
}

export function decodeLyricsBase64(encoded: string): string {
  try {
    const clean = encoded.replace(/^LyrHdr\d*/, "");
    const compressed = base64ToArrayBuffer(clean);
    const decompressed = pako.inflate(compressed);
    return TIS620ToString(decompressed);
  } catch (e) {
    console.error("Failed to decompress lyrics data:", e);
    return "";
  }
}

export function parseKLyrXML(xmlString: string): {
  info: SongInfo;
  lyrics: LyricEvent[][];
} {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError)
    throw new Error("XML parsing error: " + parserError.textContent);

  const info: any = {};
  const infoNode = xmlDoc.querySelector("INFO");
  if (infoNode) {
    for (const child of Array.from(infoNode.children)) {
      info[child.tagName] = child.textContent || "";
    }
  }

  const lyrics: LyricEvent[][] = [];
  xmlDoc.querySelectorAll("LYRIC LINE").forEach((lineNode) => {
    const words: LyricEvent[] = [];
    lineNode.querySelectorAll("WORD").forEach((wordNode) => {
      const timeNode = wordNode.querySelector("TIME");
      const textNode = wordNode.querySelector("TEXT");
      const vocalNode = wordNode.querySelector("VOCAL");
      if (timeNode && textNode) {
        words.push({
          tick: parseInt(timeNode.textContent || "0", 10),
          text: textNode.textContent || "",
          vocal: vocalNode ? vocalNode.textContent || "" : "",
        });
      }
    });
    if (words.length > 0) lyrics.push(words);
  });
  return { info, lyrics };
}
