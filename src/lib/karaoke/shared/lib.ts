import { LyricEvent, SongInfo } from "../midi/types";
import { buildKlyrXml } from "../lyrics-core/xml";
import type { LyricsDocument } from "../lyrics-core/types";

export type KlyrTextEncoding = "tis-620" | "utf-8";

export function isTIS620Compatible(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const char = value.charCodeAt(i);
    if (char > 127 && (char < 0x0e01 || char > 0x0e5b)) return false;
  }
  return true;
}

export function stringToTIS620(str: string): Uint8Array {
  const bytes = [];
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

export function encodeKlyrXml(
  xml: string,
  encoding: KlyrTextEncoding
): Uint8Array {
  return encoding === "utf-8"
    ? new TextEncoder().encode(xml)
    : stringToTIS620(xml);
}

export function decodeKlyrXmlBytes(bytes: Uint8Array): {
  xml: string;
  encoding: KlyrTextEncoding;
} {
  // CHARSET is written with ASCII characters, so it can be inspected from
  // either legacy TIS-620 bytes or UTF-8 bytes before decoding the lyrics.
  const utf8Probe = new TextDecoder().decode(bytes);
  const charset = utf8Probe.match(
    /<CHARSET>\s*(UTF-8|TIS-620)\s*<\/CHARSET>/i
  )?.[1]?.toUpperCase();
  let isValidUtf8 = true;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    isValidUtf8 = false;
  }

  const encoding: KlyrTextEncoding =
    charset === "UTF-8" ||
    (charset === undefined && isValidUtf8 && !isTIS620Compatible(utf8Probe))
      ? "utf-8"
      : "tis-620";

  return {
    encoding,
    xml:
      encoding === "utf-8"
        ? utf8Probe
        : TIS620ToString(bytes),
  };
}

export function TIS620ToString(bytes: Uint8Array): string {
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte <= 127) {
      str += String.fromCharCode(byte);
    } else if (byte >= 0xa1 && byte <= 0xfb) {
      str += String.fromCharCode(byte - 0xa1 + 0x0e01);
    } else {
      str += String.fromCharCode(0x3f);
    }
  }
  return str;
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  let clean = base64.replace(/^LyrHdr\d*/, "").replace(/[\r\n\s]+/g, "");
  while (clean.length % 4 !== 0) clean += "=";
  const buffer = Buffer.from(clean, "base64");
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
}

export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  let u8arr: Uint8Array;
  if (buffer instanceof ArrayBuffer) {
    u8arr = new Uint8Array(buffer);
  } else {
    u8arr = buffer;
  }

  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < u8arr.length; i += chunkSize) {
    binary += String.fromCharCode(...u8arr.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * `lyricsData` ticks are real MIDI ticks; `buildKlyrXml` scales them down to
 * NCN cursor units, so the song's PPQ has to come along for the ride.
 */
export function buildKLyrXML(
  infoData: SongInfo,
  lyricsData: LyricEvent[][],
  mode: "midi" | "mp3",
  ppq = 0
): string {
  const document: LyricsDocument = {
    source: mode === "midi" ? "KMID" : "MP3",
    timeBase:
      mode === "midi" ? { kind: "midi-tick", ppq } : { kind: "seconds" },
    info: infoData,
    lines: lyricsData.map((line, lineIndex) =>
      line.map((word, wordIndex) => ({
        id: `lyric-${lineIndex}-${wordIndex}`,
        text: word.text,
        vocal: word.vocal,
        at: mode === "mp3" ? word.tick / 1000 : word.tick,
      }))
    ),
  };

  return buildKlyrXml(document);
}
