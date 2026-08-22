import pako from "pako";
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  decodeKlyrXmlBytes,
  encodeKlyrXml,
  isTIS620Compatible,
  TIS620ToString,
} from "../shared/lib";
import { LyricEvent, SongInfo } from "../midi/types";
import { parseKlyrXml } from "../lyrics-core/xml";

export function encodeLyricsBase64(
  xmlText: string,
  header = "LyrHdr1"
): string {
  const declaredCharset = xmlText
    .match(/<CHARSET>\s*(UTF-8|TIS-620)\s*<\/CHARSET>/i)?.[1]
    ?.toUpperCase();
  const textEncoding =
    declaredCharset === "UTF-8"
      ? "utf-8"
      : declaredCharset === "TIS-620" || isTIS620Compatible(xmlText)
        ? "tis-620"
        : "utf-8";
  const xmlBytes = encodeKlyrXml(xmlText, textEncoding);
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
    return decodeKlyrXmlBytes(decompressed).xml;
  } catch (e) {
    console.error("Failed to decompress lyrics data:", e);
    return "";
  }
}

export function parseKLyrXML(xmlString: string): {
  info: SongInfo;
  lyrics: LyricEvent[][];
} {
  const document = parseKlyrXml(xmlString, {
    source: "MP3",
    timeBase: { kind: "seconds" },
  });

  return {
    info: document.info as SongInfo,
    lyrics: document.lines.map((line) =>
      line
        .filter((word) => word.at !== null)
        .map((word) => ({
          tick: word.at! * 1000,
          text: word.text,
          vocal: word.vocal,
        }))
    ),
  };
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
