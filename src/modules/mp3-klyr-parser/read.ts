import { DEFAULT_SONG_INFO } from "../midi-klyr-parser/lib/processor";
import { decodeTIS620Text, decodeLyricsBase64, parseKLyrXML } from "./lib/lib";
import { IReadMp3Result, IParsedMp3Data, DEFAULT_MISC } from "./type";

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
        textStart += 1;

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

export async function readMp3(file: File): Promise<IReadMp3Result> {
  const buffer = await file.arrayBuffer();
  const { tags, audioData } = readID3Tags(buffer);

  console.log(tags);

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

  if (miscTags.TEXT && miscTags.TEXT.startsWith("LyrHdr")) {
    lyricsRawData = miscTags.TEXT;
    result.lyricsTagKey = "TEXT";
  } else if (miscTags.TXXX_TEXT && miscTags.TXXX_TEXT.startsWith("LyrHdr")) {
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
      if (key === "TXXX_TEXT" || key === "TXXX_Lyricist" || key === "TEXT")
        continue;
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
