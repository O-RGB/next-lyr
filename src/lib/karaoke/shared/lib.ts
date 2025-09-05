import { LyricEvent, SongInfo } from "../midi/types";

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

export function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

export function buildKLyrXML(
  infoData: SongInfo,
  lyricsData: LyricEvent[][],
  mode: "midi" | "mp3"
): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\r\n<SONG_LYRIC>\r\n';

  if (infoData && Object.keys(infoData).length > 0) {
    xml += "  <INFO>\r\n";
    for (const [key, value] of Object.entries(infoData)) {
      if (value !== "" && value !== undefined)
        xml += `    <${key}>${escapeXml(String(value))}</${key}>\r\n`;
    }
    xml += "  </INFO>\r\n";
  }

  if (lyricsData?.length > 0) {
    xml += "  <LYRIC>\r\n";
    lyricsData.forEach((line) => {
      if (line.length > 0) {
        xml += "    <LINE>\r\n";
        if (mode === "midi") {
          xml += `      <TIME>${line[0].tick}</TIME>\r\n`;
        }
        line.forEach((word) => {
          xml += "      <WORD>\r\n";
          xml += `        <TIME>${word.tick}</TIME>\r\n`;
          xml += `        <TEXT>${escapeXml(word.text)}</TEXT>\r\n`;
          if (mode === "midi") {
            if (word.vocal === "9" || word.vocal === "NONE") {
              xml += `        <VOCAL></VOCAL>\r\n`;
            } else {
              xml += `        <VOCAL>${
                word.vocal ? escapeXml(word.vocal) : ""
              }</VOCAL>\r\n`;
            }
          } else {
            let vocal = "";
            if (word.vocal !== "NONE" && word.vocal !== undefined) {
              vocal = word.vocal;
            }
            xml += `        <VOCAL>${escapeXml(vocal)}</VOCAL>\r\n`;
          }
          xml += "      </WORD>\r\n";
        });
        xml += "    </LINE>\r\n";
      }
    });
    xml += "  </LYRIC>\r\n";
  }
  xml += "</SONG_LYRIC>\r\n";
  console.log(xml);
  return xml;
}
