import { deflateSync } from "fflate";
import {
  arrayBufferToBase64,
  buildKLyrXML,
  stringToTIS620,
} from "../shared/lib";
import { MidiFile, MidiTrack, MidiEvent, BuildOptions } from "./types";

function writeVariableLength(value: number): number[] {
  if (value < 0)
    throw new Error("Cannot write negative variable-length quantity.");
  if (value === 0) return [0];
  const buffer: number[] = [];
  while (value > 0) {
    buffer.push(value & 0x7f);
    value >>= 7;
  }
  const reversedBuffer = buffer.reverse();
  for (let i = 0; i < reversedBuffer.length - 1; i++) reversedBuffer[i] |= 0x80;
  return reversedBuffer;
}

function _encodeKLyrPayload(xml: string): string {
  const xmlBytes = stringToTIS620(xml);
  // const compressed = pako.deflate(xmlBytes, { level: 9 });
  const compressed = deflateSync(xmlBytes, { level: 9 });

  return arrayBufferToBase64(compressed);
}

function _createModifiedMidi(
  options: BuildOptions
): Omit<MidiFile, "trackCount"> {
  const {
    originalMidiData,
    newSongInfo,
    newLyricsData,
    newChordsData,
    headerToUse,
  } = options;
  const { format, ticksPerBeat } = originalMidiData;

  let workingTracks = originalMidiData.tracks.map((track) =>
    track.filter((event) => !(event.type === "meta" && event.metaType === 0x06))
  );

  const otherTracks = workingTracks.filter(
    (track) =>
      !track.some(
        (event) =>
          (event.type === "meta" &&
            event.metaType === 0x03 &&
            event.text?.trim() === "@LYRIC") ||
          (event.type === "meta" &&
            event.metaType === 0x01 &&
            event.text?.match(/K?LyrHdr\d*/i))
      )
  );

  if (newChordsData && newChordsData.length > 0) {
    let targetTrackIndex = otherTracks.findIndex((track) =>
      track.some((e) => e.type === "meta" && e.metaType === 0x51)
    );
    if (targetTrackIndex === -1 && otherTracks.length > 0) targetTrackIndex = 0;
    if (targetTrackIndex !== -1) {
      const newMarkerEvents: MidiEvent[] = newChordsData.map((chord) => ({
        type: "meta",
        metaType: 0x06,
        text: chord.chord.trim(),
        absoluteTime: chord.tick,
        data: new Uint8Array(),
      }));
      otherTracks[targetTrackIndex].push(...newMarkerEvents);
      otherTracks[targetTrackIndex].sort(
        (a, b) => a.absoluteTime - b.absoluteTime
      );
    }
  }

  const finalTracks = [...otherTracks];
  if (
    (newSongInfo && Object.keys(newSongInfo).length > 0) ||
    (newLyricsData && newLyricsData.length > 0)
  ) {
    const klyrXml = buildKLyrXML(newSongInfo, newLyricsData, "midi");
    const encodedKLyr = _encodeKLyrPayload(klyrXml);
    const newLyricTrack: MidiTrack = [
      {
        type: "meta",
        metaType: 0x03,
        text: "@LYRIC",
        absoluteTime: 0,
        data: new Uint8Array(),
      },
      {
        type: "meta",
        metaType: 0x01,
        text: headerToUse + encodedKLyr,
        absoluteTime: 1,
        data: new Uint8Array(),
      },
    ];
    finalTracks.push(newLyricTrack);
  }

  return { format, ticksPerBeat, tracks: finalTracks };
}

function _buildTrackData(track: MidiTrack): Uint8Array {
  const chunks: number[] = [];
  let currentTime = 0;
  let lastStatus: number | null = null;

  track.forEach((event) => {
    const deltaTime = event.absoluteTime - currentTime;
    chunks.push(...writeVariableLength(deltaTime));
    currentTime = event.absoluteTime;

    if (event.type === "meta") {
      chunks.push(0xff, event.metaType);
      const data =
        event.text !== undefined
          ? stringToTIS620(event.text)
          : event.data || new Uint8Array(0);
      chunks.push(...writeVariableLength(data.length));
      chunks.push(...Array.from(data));
      lastStatus = null;
    } else if (event.type === "channel") {
      if (event.status !== lastStatus) {
        chunks.push(event.status);
        lastStatus = event.status;
      }
      chunks.push(...event.data);
    } else if (event.type === "sysex") {
      chunks.push(0xf0);
      chunks.push(...writeVariableLength(event.data.length));
      chunks.push(...event.data);
      lastStatus = null;
    }
  });

  if (!track.some((e) => e.type === "meta" && e.metaType === 0x2f)) {
    chunks.push(0x00, 0xff, 0x2f, 0x00);
  }

  return new Uint8Array(chunks);
}

function _buildMidiFile(
  midiStructure: Omit<MidiFile, "trackCount">
): Uint8Array {
  const { format, ticksPerBeat, tracks } = midiStructure;
  const trackBuffers: Uint8Array[] = tracks.map(_buildTrackData);
  const totalLength =
    14 + trackBuffers.reduce((sum, buf) => sum + 8 + buf.length, 0);
  const output = new Uint8Array(totalLength);
  const view = new DataView(output.buffer);

  let offset = 0;
  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i++) output[offset++] = str.charCodeAt(i);
  };

  writeString("MThd");
  view.setUint32(offset, 6);
  offset += 4;
  view.setUint16(offset, format);
  offset += 2;
  view.setUint16(offset, tracks.length);
  offset += 2;
  view.setUint16(offset, ticksPerBeat);
  offset += 2;

  for (const trackBuffer of trackBuffers) {
    writeString("MTrk");
    view.setUint32(offset, trackBuffer.length);
    offset += 4;
    output.set(trackBuffer, offset);
    offset += trackBuffer.length;
  }

  return output;
}

export function buildModifiedMidi(options: BuildOptions): Uint8Array {
  const modified = _createModifiedMidi(options);
  return _buildMidiFile(modified);
}
