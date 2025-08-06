import { LyricEvent, SongInfo } from "@/modules/midi-klyr-parser/lib/processor";
import pako from "pako";

// BUILD
export function buildKLyrXML(
  infoData: SongInfo,
  lyricsData: LyricEvent[][]
): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\r\n<SONG_LYRIC>\r\n';
  const escapeXml = (str: string) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  if (infoData && Object.keys(infoData).length > 0) {
    xml += "  <INFO>\r\n";
    for (const [key, value] of Object.entries(infoData)) {
      xml += `    <${key}>${escapeXml(value)}</${key}>\r\n`;
    }
    xml += "  </INFO>\r\n";
  }
  if (lyricsData?.length > 0) {
    xml += "  <LYRIC>\r\n";
    lyricsData.forEach((line) => {
      if (line.length > 0) {
        xml += "    <LINE>\r\n";
        line.forEach((word) => {
          xml += "      <WORD>\r\n";
          xml += `        <TIME>${word.tick}</TIME>\r\n`;
          xml += `        <TEXT>${escapeXml(word.text)}</TEXT>\r\n`;
          xml += `        <VOCAL>${
            word.vocal ? escapeXml(word.vocal) : ""
          }</VOCAL>\r\n`;
          xml += "      </WORD>\r\n";
        });
        xml += "    </LINE>\r\n";
      }
    });
    xml += "  </LYRIC>\r\n";
  }
  xml += "</SONG_LYRIC>\r\n";
  return xml;
}

export function concat(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export function encodeLyricsBase64(
  xmlText: string,
  header = "LyrHdr1"
): string {
  const xmlBytes = stringToTIS620(xmlText);
  const compressed = pako.deflate(xmlBytes, { level: 9 });
  return header + arrayBufferToBase64(compressed);
}

export function stringToTIS620(str: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    if (char <= 127) {
      bytes.push(char);
    } else if (char >= 0x0e01 && char <= 0x0e5b) {
      bytes.push(char - 0x0e01 + 0xa1);
    } else {
      bytes.push(0x3f);
    }
  }
  return new Uint8Array(bytes);
}

// READ

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  let clean = base64.replace(/^LyrHdr\d*/, "").replace(/[\r\n\s]+/g, "");
  while (clean.length % 4 !== 0) clean += "=";
  return Buffer.from(clean, "base64");
}

export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const u8arr = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < u8arr.length; i += chunkSize) {
    binary += String.fromCharCode(...u8arr.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function TIS620ToString(bytes: Uint8Array): string {
  if (!bytes) return "";
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte <= 127) {
      str += String.fromCharCode(byte);
    } else if (byte >= 0xa1 && byte <= 0xfb) {
      str += String.fromCharCode(byte - 0xa1 + 0x0e01);
    } else {
      str += "?";
    }
  }
  return str;
}

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
