import pako from "pako";
import {
  ChordEvent,
  DEFAULT_SONG_INFO,
  LyricEvent,
  SongInfo,
} from "../midi-klyr-parser/lib/processor";

export const DEFAULT_MISC: MiscTags = {
  MajorBrand: "dash",
  MinorVersion: 0,
  CompatibleBrands: "iso6mp41",
  EncoderSettings: "Lavf60.16.100",
};
export interface MiscTags {
  MajorBrand: string;
  MinorVersion: number;
  CompatibleBrands: string;
  EncoderSettings: string;
}

export interface IParsedMp3Data {
  title: string;
  artist: string;
  album: string;
  info: SongInfo;
  lyrics: LyricEvent[][];
  chords: ChordEvent[];
  miscTags?: MiscTags;
  lyricsTagKey?: string;
}

export interface IReadMp3Result {
  parsedData: IParsedMp3Data;
  audioData: ArrayBuffer;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (error: any) {
    throw new Error("Invalid base64 data: " + error.message);
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const u8arr = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < u8arr.length; i += chunkSize) {
    binary += String.fromCharCode(...u8arr.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function stringToTIS620(str: string): Uint8Array {
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

function TIS620ToString(bytes: Uint8Array): string {
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

function decodeTIS620Text(text: string): string {
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

function decodeLyricsBase64(encoded: string): string {
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

function encodeLyricsBase64(xmlText: string, header = "LyrHdr1"): string {
  const xmlBytes = stringToTIS620(xmlText);
  const compressed = pako.deflate(xmlBytes, { level: 9 });
  return header + arrayBufferToBase64(compressed);
}

function parseKLyrXML(xmlString: string): {
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

function buildKLyrXML(infoData: SongInfo, lyricsData: LyricEvent[][]): string {
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

function concat(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function readID3Tags(buffer: ArrayBuffer): {
  tags: { [key: string]: string };
  audioData: ArrayBuffer;
} {
  const view = new DataView(buffer);
  const tags: { [key: string]: string } = {};
  let id3Size = 0;

  if (
    view.byteLength > 10 &&
    String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2)
    ) === "ID3"
  ) {
    id3Size =
      ((view.getUint8(6) & 0x7f) << 21) |
      ((view.getUint8(7) & 0x7f) << 14) |
      ((view.getUint8(8) & 0x7f) << 7) |
      (view.getUint8(9) & 0x7f);
    let offset = 10;

    const readTextFrame = (start: number, size: number) => {
      let text = "";
      for (let i = start + 1; i < start + size; i++) {
        const char = view.getUint8(i);
        if (char === 0) break;
        text += String.fromCharCode(char);
      }
      return text;
    };

    while (offset < id3Size + 10) {
      if (offset + 10 > buffer.byteLength) break;
      const frameID = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );
      const frameSize = view.getUint32(offset + 4, false);

      if (
        frameSize <= 0 ||
        !/^[A-Z0-9]{4}$/.test(frameID) ||
        offset + 10 + frameSize > buffer.byteLength
      ) {
        break;
      }

      if (frameID === "TXXX") {
        let textStart = offset + 10;
        textStart += 1; // skip encoding

        let description = "";
        let value = "";

        let nullPos = textStart;
        while (
          nullPos < offset + 10 + frameSize &&
          view.getUint8(nullPos) !== 0
        ) {
          nullPos++;
        }
        for (let i = textStart; i < nullPos; i++) {
          description += String.fromCharCode(view.getUint8(i));
        }

        textStart = nullPos + 1;
        if (textStart < offset + 10 + frameSize) {
          for (let i = textStart; i < offset + 10 + frameSize; i++) {
            const char = view.getUint8(i);
            if (char === 0) break;
            value += String.fromCharCode(char);
          }
        }
        tags[`TXXX_${description}`] = value;
      } else if (frameID.startsWith("T") || frameID === "USLT") {
        const value = readTextFrame(offset + 10, frameSize);
        tags[frameID] = value;
      }
      offset += 10 + frameSize;
    }
    return { tags, audioData: buffer.slice(10 + id3Size) };
  }
  return { tags, audioData: buffer };
}

function toSynchsafe(size: number): [number, number, number, number] {
  return [
    (size >> 21) & 0x7f,
    (size >> 14) & 0x7f,
    (size >> 7) & 0x7f,
    size & 0x7f,
  ];
}

// ===================================================================
// START: โค้ดที่แก้ไขและปรับปรุง
// ===================================================================

/**
 * สร้าง ID3v2.4 Tag Buffer จากข้อมูลที่กำหนด
 * @param tags Object ที่มี key เป็น Frame ID (เช่น 'TIT2', 'TXXX_MajorBrand')
 * @returns Uint8Array ของ ID3 Tag ทั้งหมด
 */
function buildID3v2(tags: { [key: string]: string | number }): Uint8Array {
  const frames: Uint8Array[] = [];

  // ลำดับให้เหมือน V2.mp3
  const order = [
    "TXXX_major_brand",
    "TXXX_minor_version",
    "TXXX_compatible_brands",
    "TSSE",
    "TIT2",
    "TPE1",
    "TALB",
    "TEXT",
    "TXXX_CHORD",
  ];

  const sortedKeys = [
    ...order.filter((key) => tags[key] !== undefined && tags[key] !== null),
    ...Object.keys(tags).filter(
      (key) =>
        !order.includes(key) && tags[key] !== undefined && tags[key] !== null
    ),
  ];

  for (const frameID of sortedKeys) {
    const value = tags[frameID];
    if (value === undefined || value === null) continue;

    let frameData: Uint8Array;
    const header = new Uint8Array(10);
    const stringValue = String(value);

    if (frameID.startsWith("TXXX_")) {
      header.set(new TextEncoder().encode("TXXX"), 0);
      const description = frameID.substring(5);
      const descBytes = new TextEncoder().encode(description);
      const valueBytes = new TextEncoder().encode(stringValue);

      frameData = new Uint8Array(1 + descBytes.length + 1 + valueBytes.length);
      frameData[0] = 0x00;
      frameData.set(descBytes, 1);
      frameData[1 + descBytes.length] = 0;
      frameData.set(valueBytes, 2 + descBytes.length);
    } else if (frameID.length === 4 && frameID.startsWith("T")) {
      header.set(new TextEncoder().encode(frameID), 0);
      const encodedValueBytes = stringToTIS620(stringValue);
      frameData = new Uint8Array(1 + encodedValueBytes.length);
      frameData[0] = 0x00;
      frameData.set(encodedValueBytes, 1);
    } else {
      continue;
    }

    const sizeBytes = toSynchsafe(frameData.length);
    header.set(new Uint8Array(sizeBytes), 4);
    header.set(new Uint8Array([0, 0]), 8);

    frames.push(header, frameData);
  }

  const framesBuffer = concat(frames);
  const id3Header = new Uint8Array(10);
  id3Header.set(new TextEncoder().encode("ID3"), 0);
  id3Header[3] = 4;
  id3Header[4] = 0;
  id3Header[5] = 0;
  id3Header.set(new Uint8Array(toSynchsafe(framesBuffer.length)), 6);

  return concat([id3Header, framesBuffer]);
}

/** อ่านและ Parse ข้อมูลจากไฟล์ MP3 */
export async function readMp3(file: File): Promise<IReadMp3Result> {
  const buffer = await file.arrayBuffer();
  const { tags, audioData } = readID3Tags(buffer);

  const miscTags = { ...tags };
  const result: IParsedMp3Data = {
    title: "",
    artist: "",
    album: "",
    info: DEFAULT_SONG_INFO,
    lyrics: [],
    chords: [],
    miscTags: DEFAULT_MISC,
    lyricsTagKey: undefined,
  };

  if (miscTags.TIT2) {
    result.title = decodeTIS620Text(miscTags.TIT2);
    delete miscTags.TIT2;
  }
  if (miscTags.TPE1) {
    result.artist = decodeTIS620Text(miscTags.TPE1);
    delete miscTags.TPE1;
  }
  if (miscTags.TALB) {
    result.album = decodeTIS620Text(miscTags.TALB);
    delete miscTags.TALB;
  }

  let lyricsRawData: string | null = null;
  if (miscTags.TXXX_TEXT && miscTags.TXXX_TEXT.startsWith("LyrHdr")) {
    lyricsRawData = miscTags.TXXX_TEXT;
    result.lyricsTagKey = "TXXX_TEXT";
  } else if (
    miscTags["TXXX_Lyricist"] &&
    miscTags["TXXX_Lyricist"].startsWith("LyrHdr")
  ) {
    lyricsRawData = miscTags["TXXX_Lyricist"];
    result.lyricsTagKey = "TXXX_Lyricist";
  } else {
    for (const key in miscTags) {
      if (key === "TXXX_TEXT" || key === "TXXX_Lyricist") continue;
      if (
        typeof miscTags[key] === "string" &&
        miscTags[key].startsWith("LyrHdr")
      ) {
        lyricsRawData = miscTags[key];
        result.lyricsTagKey = key;
        break;
      }
    }
  }

  if (lyricsRawData && result.lyricsTagKey) {
    try {
      const lyricsXML = decodeLyricsBase64(lyricsRawData);
      if (lyricsXML) {
        const klyrData = parseKLyrXML(lyricsXML);
        result.info = klyrData.info;
        result.lyrics = klyrData.lyrics;
      }
    } catch (err) {
      console.error("Failed to decode or parse lyrics:", err);
    }
    delete miscTags[result.lyricsTagKey];
  }

  if (miscTags.TXXX_CHORD) {
    try {
      const chordJSON = atob(miscTags.TXXX_CHORD);
      const parsedChords = JSON.parse(chordJSON);
      if (Array.isArray(parsedChords)) {
        result.chords = parsedChords;
      }
    } catch (err) {
      console.error("Failed to decode or parse chords:", err);
    }
    delete miscTags.TXXX_CHORD;
  }

  if (miscTags.TXXX_LYRICS) delete miscTags.TXXX_LYRICS;
  result.miscTags = miscTags as any;

  Object.defineProperty(result, "miscTags", {
    value: result.miscTags,
    enumerable: false,
  });
  Object.defineProperty(result, "lyricsTagKey", {
    value: result.lyricsTagKey,
    enumerable: false,
  });

  return { parsedData: result, audioData };
}

/** * สร้างไฟล์ MP3 Buffer จากข้อมูลที่ Parse มา (สร้าง ID3v2.4 + เรียงลำดับแท็กใหม่)
 * โค้ดส่วนนี้ถูกปรับปรุงให้สะอาดและชัดเจนขึ้น
 */

export function buildMp3(
  parsedData: IParsedMp3Data,
  audioData: ArrayBuffer
): ArrayBuffer {
  const newTags: { [key: string]: string | number } = {};

  // ฟิลด์หลัก
  if (parsedData.title) newTags.TIT2 = parsedData.title;
  if (parsedData.artist) newTags.TPE1 = parsedData.artist;
  if (parsedData.album) newTags.TALB = parsedData.album;

  // ปรับให้ตรง V2
  if (parsedData.miscTags) {
    if (parsedData.miscTags.MajorBrand)
      newTags["TXXX_major_brand"] = parsedData.miscTags.MajorBrand;
    if (
      parsedData.miscTags.MinorVersion !== undefined &&
      parsedData.miscTags.MinorVersion !== null
    )
      newTags["TXXX_minor_version"] = parsedData.miscTags.MinorVersion;
    if (parsedData.miscTags.CompatibleBrands)
      newTags["TXXX_compatible_brands"] = parsedData.miscTags.CompatibleBrands;
    if (parsedData.miscTags.EncoderSettings)
      newTags.TSSE = parsedData.miscTags.EncoderSettings;
  }

  // Lyrics → TEXT
  if (parsedData.lyrics?.length) {
    const xml = buildKLyrXML(parsedData.info, parsedData.lyrics);
    newTags["TEXT"] = encodeLyricsBase64(xml, "LyrHdr1");
  }

  // Chords
  if (parsedData.chords?.length) {
    newTags["TXXX_CHORD"] = btoa(JSON.stringify(parsedData.chords));
  }

  const id3Buffer = buildID3v2(newTags);
  return concat([id3Buffer, new Uint8Array(audioData)]).buffer;
}

// ===================================================================
// END: โค้ดที่แก้ไขและปรับปรุง
// ===================================================================
