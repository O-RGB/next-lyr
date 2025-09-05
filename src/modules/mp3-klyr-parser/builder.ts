// import { IParsedMp3Data } from "./type";
// import {
//   buildKLyrXML,
//   concat,
//   encodeLyricsBase64,
//   stringToTIS620,
// } from "./lib/lib";

// function stripID3v2(audio: ArrayBuffer): Uint8Array {
//   const bytes = new Uint8Array(audio);
//   if (bytes[0] === 73 && bytes[1] === 68 && bytes[2] === 51) {
//     const size =
//       (bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9];
//     return bytes.slice(10 + size);
//   }
//   return bytes;
// }

// function createTextFrame(
//   frameID: string,
//   text: string,
//   useTIS620: boolean = false
// ): Uint8Array {
//   const encoder = new TextEncoder();

//   const textBytes = useTIS620 ? stringToTIS620(text) : encoder.encode(text);
//   const frameData = new Uint8Array(1 + textBytes.length);
//   frameData[0] = 0x00;
//   frameData.set(textBytes, 1);

//   const header = new Uint8Array(10);
//   header.set(encoder.encode(frameID), 0);
//   header.set(toSynchsafe(frameData.length), 4);

//   return concat([header, frameData]);
// }

// function toSynchsafe(size: number): [number, number, number, number] {
//   return [
//     (size >> 21) & 0x7f,
//     (size >> 14) & 0x7f,
//     (size >> 7) & 0x7f,
//     size & 0x7f,
//   ];
// }

// function buildID3v2(tags: {
//   MajorBrand?: string;
//   MinorVersion?: number;
//   CompatibleBrands?: string;
//   EncoderSettings?: string;
//   Title?: string;
//   Artist?: string;
//   Album?: string;
//   LyricsTagKey?: string;
//   LyricsBase64?: string;
//   ChordsBase64?: string;
// }): Uint8Array {
//   const frames: Uint8Array[] = [];

//   function createTxxxFrame(description: string, value: string): Uint8Array {
//     const encoder = new TextEncoder();
//     const descBytes = encoder.encode(description);
//     const valueBytes = encoder.encode(value);

//     const frameData = new Uint8Array(
//       1 + descBytes.length + 1 + valueBytes.length
//     );
//     frameData[0] = 0x03;
//     frameData.set(descBytes, 1);
//     frameData[descBytes.length + 1] = 0x00;
//     frameData.set(valueBytes, descBytes.length + 2);

//     const header = new Uint8Array(10);
//     header.set(encoder.encode("TXXX"), 0);
//     header.set(toSynchsafe(frameData.length), 4);

//     return concat([header, frameData]);
//   }

//   if (tags.MajorBrand) {
//     frames.push(createTxxxFrame("MajorBrand", tags.MajorBrand));
//   }
//   if (tags.MinorVersion !== undefined) {
//     frames.push(createTxxxFrame("MinorVersion", String(tags.MinorVersion)));
//   }
//   if (tags.CompatibleBrands) {
//     frames.push(createTxxxFrame("CompatibleBrands", tags.CompatibleBrands));
//   }
//   if (tags.EncoderSettings) {
//     frames.push(createTextFrame("TSSE", tags.EncoderSettings));
//   }
//   if (tags.Title) {
//     frames.push(createTextFrame("TIT2", tags.Title, true));
//   }
//   if (tags.Artist) {
//     frames.push(createTextFrame("TPE1", tags.Artist, true));
//   }
//   if (tags.Album) {
//     frames.push(createTextFrame("TALB", tags.Album, true));
//   }

//   if (tags.LyricsBase64) {
//     const lyricsTag = tags.LyricsTagKey || "TEXT";
//     if (lyricsTag.startsWith("TXXX_")) {
//       const description = lyricsTag.replace("TXXX_", "");
//       frames.push(createTxxxFrame(description, tags.LyricsBase64));
//     } else {
//       frames.push(createTextFrame(lyricsTag, tags.LyricsBase64));
//     }
//   }

//   if (tags.ChordsBase64) {
//     frames.push(createTxxxFrame("CHORD", tags.ChordsBase64));
//   }

//   const framesBuffer = concat(frames);
//   const id3Header = new Uint8Array(10);
//   const encoder = new TextEncoder();
//   id3Header.set(encoder.encode("ID3"), 0);
//   id3Header[3] = 3;
//   id3Header[4] = 0;
//   id3Header[5] = 0;
//   id3Header.set(toSynchsafe(framesBuffer.length), 6);

//   return concat([id3Header, framesBuffer]);
// }

// export function buildMp3(
//   parsedData: IParsedMp3Data,
//   audioData: ArrayBuffer
// ): ArrayBuffer {
//   const newTags: any = {};

//   newTags.Title = parsedData.title;
//   newTags.Artist = parsedData.artist;
//   newTags.Album = parsedData.album;

//   if (parsedData.miscTags) {
//     newTags.MajorBrand = parsedData.miscTags.MajorBrand;
//     newTags.MinorVersion = parsedData.miscTags.MinorVersion;
//     newTags.CompatibleBrands = parsedData.miscTags.CompatibleBrands;
//     newTags.EncoderSettings = parsedData.miscTags.EncoderSettings;
//   }

//   if (parsedData.lyrics?.length) {
//     const xml = buildKLyrXML(parsedData.info, parsedData.lyrics);
//     newTags.LyricsBase64 = encodeLyricsBase64(xml, "LyrHdr1");

//     newTags.LyricsTagKey = parsedData.lyricsTagKey;
//   }

//   if (parsedData.chords?.length) {
//     newTags.ChordsBase64 = btoa(JSON.stringify(parsedData.chords));
//   }

//   const id3Buffer = buildID3v2(newTags);
//   const rawAudio = stripID3v2(audioData);
//   return concat([id3Buffer, rawAudio]).buffer as ArrayBuffer;
// }
