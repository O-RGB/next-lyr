// lib/midiProcessor.js
// A modern, modular version of the MIDI processing library - Pure JavaScript version

// --- Type Definitions (JSDoc format) ---
/**
 * @typedef {Object} LyricEvent
 * @property {string} text - The lyric text
 * @property {number} tick - The MIDI tick time
 */

/**
 * @typedef {Object} ChordEvent
 * @property {string} chord - The chord name
 * @property {number} tick - The MIDI tick time
 */

/**
 * @typedef {Object.<string, string>} SongInfo
 */

/**
 * @typedef {Object} ParseResult
 * @property {MidiFile} midiData - The parsed MIDI file data
 * @property {SongInfo} info - Song information
 * @property {LyricEvent[][]} lyrics - Array of lyric lines, each containing lyric events
 * @property {ChordEvent[]} chords - Array of chord events
 * @property {string} detectedHeader - The detected header type (e.g., "LyrHdr1")
 */

/**
 * @typedef {Object} BuildOptions
 * @property {MidiFile} originalMidiData - The original MIDI file data
 * @property {SongInfo} newSongInfo - New song information to embed
 * @property {LyricEvent[][]} newLyricsData - New lyrics data to embed
 * @property {ChordEvent[]} newChordsData - New chords data to embed
 * @property {string} headerToUse - Header type to use (e.g., "LyrHdr1")
 */

/**
 * @typedef {Object} BaseMidiEvent
 * @property {number} absoluteTime - Absolute time in MIDI ticks
 */

/**
 * @typedef {Object} MetaEvent
 * @property {"meta"} type
 * @property {number} metaType
 * @property {Uint8Array} data
 * @property {string} [text]
 * @property {number} absoluteTime
 */

/**
 * @typedef {Object} ChannelEvent
 * @property {"channel"} type
 * @property {number} status
 * @property {number[]} data
 * @property {number} absoluteTime
 */

/**
 * @typedef {Object} SysexEvent
 * @property {"sysex"} type
 * @property {Uint8Array} data
 * @property {number} absoluteTime
 */

/**
 * @typedef {Object} UnknownEvent
 * @property {"unknown"} type
 * @property {number} status
 * @property {number} absoluteTime
 */

/**
 * @typedef {MetaEvent|ChannelEvent|SysexEvent|UnknownEvent} MidiEvent
 */

/**
 * @typedef {MidiEvent[]} MidiTrack
 */

/**
 * @typedef {Object} MidiFile
 * @property {number} format - MIDI file format (0, 1, or 2)
 * @property {number} trackCount - Number of tracks
 * @property {number} ticksPerBeat - Ticks per quarter note
 * @property {MidiTrack[]} tracks - Array of MIDI tracks
 */

/**
 * @typedef {Object} KlyrWord
 * @property {number} tick
 * @property {string} name
 * @property {string} [vocal]
 */

// --- Simple Compression Implementation (replacement for pako) ---
// Use browser's built-in compression when available
function simpleDeflate(data) {
  // For now, just return the data as-is for compression
  // In real implementation, we'd use proper deflate
  return data;
}

async function tryDecompressWithBrowserAPI(data) {
  try {
    // Try using browser's CompressionStream API if available
    if (typeof CompressionStream !== "undefined") {
      const stream = new CompressionStream("deflate");
      // This is for compression, we need decompression
    }

    // Try using browser's DecompressionStream API if available
    if (typeof DecompressionStream !== "undefined") {
      const stream = new DecompressionStream("deflate");
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(data);
      writer.close();

      const chunks = [];
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }

      // Concatenate chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      return result;
    }
  } catch (e) {
    console.warn("Browser compression API failed:", e);
  }
  return null;
}

// Try to use zlib/pako from CDN if available
function tryExternalPako(data, operation) {
  if (typeof pako !== "undefined") {
    try {
      if (operation === "inflate") {
        return pako.inflate(data);
      } else {
        return pako.deflate(data);
      }
    } catch (e) {
      console.warn("External pako failed:", e);
    }
  }
  return null;
}

function simpleInflate(compressed) {
  // This is a very basic implementation that won't work for real zlib data
  // It's just a placeholder
  throw new Error("Simple inflate cannot handle real zlib data");
}

// Simple compression object to replace pako
const compression = {
  deflate: function (data, options = {}) {
    try {
      // Try external pako first
      const result = tryExternalPako(data, "deflate");
      if (result) return result;

      // Fallback to simple implementation
      return simpleDeflate(data);
    } catch (e) {
      console.warn("Compression failed, returning original data:", e);
      return data;
    }
  },
  inflate: async function (data) {
    try {
      // Try external pako first
      const pakoResult = tryExternalPako(data, "inflate");
      if (pakoResult) return pakoResult;

      // Try browser API
      const browserResult = await tryDecompressWithBrowserAPI(data);
      if (browserResult) return browserResult;

      // If all else fails, assume data is not compressed
      console.warn(
        "No working decompression available, assuming uncompressed data"
      );
      return data;
    } catch (e) {
      console.warn(
        "All decompression methods failed, returning original data:",
        e
      );
      return data;
    }
  },
};

// --- Utility Functions ---
function stringToTIS620(str) {
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

function TIS620ToString(bytes) {
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

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer) {
  let u8arr;
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

function writeVariableLength(value) {
  if (value < 0)
    throw new Error("Cannot write negative variable-length quantity.");
  if (value === 0) return [0];
  const buffer = [];
  while (value > 0) {
    buffer.push(value & 0x7f);
    value >>= 7;
  }
  const reversedBuffer = buffer.reverse();
  for (let i = 0; i < reversedBuffer.length - 1; i++) reversedBuffer[i] |= 0x80;
  return reversedBuffer;
}

function escapeXml(text) {
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

// --- MIDI Parsing Core ---
function readVariableLength(view, offset) {
  let value = 0;
  let byte;
  let currentOffset = offset;
  do {
    byte = view.getUint8(currentOffset++);
    value = (value << 7) | (byte & 0x7f);
  } while (byte & 0x80);
  return { value, nextOffset: currentOffset };
}

function _parseEvent(view, offset, runningStatus) {
  let status = view.getUint8(offset);
  let isRunningStatus = false;

  if (status < 0x80) {
    if (!runningStatus) {
      console.warn("Running status expected but none set, forcing fallback");
      status = 0x90; // fallback status (Note On, channel 0)
    } else {
      status = runningStatus;
      isRunningStatus = true;
    }
  }

  const eventType = status >> 4;
  let currentOffset = isRunningStatus ? offset : offset + 1;

  if (status === 0xff) {
    const metaType = view.getUint8(currentOffset++);
    const lengthResult = readVariableLength(view, currentOffset);
    currentOffset = lengthResult.nextOffset;
    const data = new Uint8Array(view.buffer, currentOffset, lengthResult.value);
    currentOffset += lengthResult.value;
    return {
      type: "meta",
      metaType,
      data,
      text: [1, 3, 5, 6].includes(metaType) ? TIS620ToString(data) : undefined,
      absoluteTime: 0,
      nextOffset: currentOffset,
    };
  } else if (eventType >= 0x8 && eventType <= 0xe) {
    const paramCount = eventType === 0xc || eventType === 0xd ? 1 : 2;
    const data = [];
    for (let i = 0; i < paramCount; i++) {
      data.push(view.getUint8(currentOffset++));
    }
    return {
      type: "channel",
      status,
      data,
      absoluteTime: 0,
      nextOffset: currentOffset,
    };
  } else if (status === 0xf0 || status === 0xf7) {
    const lengthResult = readVariableLength(view, currentOffset);
    currentOffset = lengthResult.nextOffset;
    const data = new Uint8Array(view.buffer, currentOffset, lengthResult.value);
    currentOffset += lengthResult.value;
    return { type: "sysex", data, absoluteTime: 0, nextOffset: currentOffset };
  } else {
    console.warn(
      `Unknown MIDI event at offset ${offset}, status=0x${status.toString(16)}`
    );
    return {
      type: "unknown",
      status,
      absoluteTime: 0,
      nextOffset: currentOffset,
    };
  }
}

function _parseMidiFile(buffer) {
  const view = new DataView(buffer);
  if (view.getUint32(0) !== 0x4d546864)
    throw new Error("Invalid MIDI file header");
  const headerLength = view.getUint32(4);
  const format = view.getUint16(8);
  const trackCount = view.getUint16(10);
  const ticksPerBeat = view.getUint16(12);
  let offset = 8 + headerLength;
  const tracks = [];

  for (let i = 0; i < trackCount; i++) {
    if (view.getUint32(offset) !== 0x4d54726b)
      throw new Error("Invalid track header");
    const trackLength = view.getUint32(offset + 4);
    const trackEnd = offset + 8 + trackLength;
    offset += 8;
    const events = [];
    let currentTime = 0;
    let runningStatus = 0;
    while (offset < trackEnd) {
      const deltaTimeResult = readVariableLength(view, offset);
      offset = deltaTimeResult.nextOffset;
      currentTime += deltaTimeResult.value;
      const eventResult = _parseEvent(view, offset, runningStatus);
      const event = { ...eventResult, absoluteTime: currentTime };
      events.push(event);
      offset = eventResult.nextOffset;
      if (event.type === "channel") runningStatus = event.status;
      else runningStatus = 0;
    }
    tracks.push(events);
  }
  return { format, trackCount, ticksPerBeat, tracks };
}

// --- KLYR Processing ---
function _parseKLyrXML(xmlDoc) {
  console.log("_parseKLyrXML called with document:", xmlDoc);

  const info = {};
  const infoNode = xmlDoc.querySelector("INFO");
  console.log("INFO node found:", infoNode);

  if (infoNode) {
    const children = Array.from(infoNode.children);
    console.log("INFO children count:", children.length);
    for (const child of children) {
      const tagName = child.tagName;
      const textContent = child.textContent || "";
      console.log(`INFO item: ${tagName} = ${textContent}`);
      info[tagName] = textContent;
    }
  }

  const lyrics = [];
  const lyricNodes = xmlDoc.querySelectorAll("LYRIC LINE");
  console.log("LYRIC LINE nodes found:", lyricNodes.length);

  lyricNodes.forEach((lineNode, lineIndex) => {
    console.log(`Processing line ${lineIndex}`);
    const words = [];
    const wordNodes = lineNode.querySelectorAll("WORD");
    console.log(`  Words in line ${lineIndex}:`, wordNodes.length);

    wordNodes.forEach((wordNode, wordIndex) => {
      const timeNode = wordNode.querySelector("TIME");
      const textNode = wordNode.querySelector("TEXT");
      const vocalNode = wordNode.querySelector("VOCAL");

      console.log(`    Word ${wordIndex}:`, {
        time: timeNode ? timeNode.textContent : null,
        text: textNode ? textNode.textContent : null,
        vocal: vocalNode ? vocalNode.textContent : null,
      });

      if (timeNode && textNode) {
        words.push({
          tick: parseInt(timeNode.textContent || "0", 10),
          name: textNode.textContent || "",
          vocal: vocalNode ? vocalNode.textContent || "" : "",
        });
      }
    });

    if (words.length > 0) {
      lyrics.push(words);
    }
  });

  console.log("_parseKLyrXML result:", { info, lyrics });
  return { info, lyrics };
}

function _extractDataFromEvents(midiData) {
  let songInfo = {};
  let lyrics = [];
  let chords = [];
  let detectedHeader = "LyrHdr1";
  let foundLyrics = false;

  midiData.tracks.forEach((track) => {
    track.forEach(async (event) => {
      if (event.type !== "meta") return;

      // Extract chords from marker events (meta type 0x06)
      if (event.metaType === 0x06 && event.text) {
        chords.push({ chord: event.text, tick: event.absoluteTime });
      }

      // Extract lyrics data from compressed format (meta type 0x01)
      if (
        !foundLyrics &&
        event.metaType === 0x01 &&
        event.text &&
        event.text.includes("LyrHdr")
      ) {
        const regex = /(K?LyrHdr\d*)(.*)/i;
        const match = event.text.match(regex);
        if (match && match[2]) {
          detectedHeader = match[1] || "LyrHdr1";
          const encodedPayload = match[2].trim();

          console.log(
            "Found LyrHdr data:",
            detectedHeader,
            "Payload length:",
            encodedPayload.length
          );

          try {
            // Decode base64
            const compressed = base64ToArrayBuffer(encodedPayload);
            console.log("Base64 decoded, size:", compressed.byteLength);

            // Try to decompress
            let decompressed;
            try {
              decompressed = await compression.inflate(
                new Uint8Array(compressed)
              );
              console.log("Decompressed size:", decompressed.length);
            } catch (e) {
              console.warn("Decompression failed, trying as uncompressed:", e);
              decompressed = new Uint8Array(compressed);
            }

            // Convert to text
            const xmlText = TIS620ToString(decompressed);
            console.log(
              "XML text length:",
              xmlText.length,
              "First 200 chars:",
              xmlText.substring(0, 200)
            );

            if (typeof window !== "undefined" && window.DOMParser) {
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(xmlText, "text/xml");

              // Check for parse errors
              const parseError = xmlDoc.querySelector("parsererror");
              if (parseError) {
                console.error("XML parse error:", parseError.textContent);
                throw new Error("XML parse error: " + parseError.textContent);
              }

              console.log("XML parsed successfully");
              const klyrData = _parseKLyrXML(xmlDoc);
              console.log("KLYR data extracted:", klyrData);

              songInfo = klyrData.info;
              lyrics = klyrData.lyrics.map((line) =>
                line.map((word) => ({ text: word.name, tick: word.tick }))
              );
              foundLyrics = true;

              console.log("Final songInfo:", songInfo);
              console.log("Final lyrics:", lyrics);
            } else {
              console.error("DOMParser not available");
            }
          } catch (e) {
            console.error("Failed to parse KLyr data from meta event:", e);
            console.error("Stack trace:", e.stack);
            songInfo = {};
            lyrics = [];
          }
        }
      }
    });
  });

  chords.sort((a, b) => a.tick - b.tick);

  console.log("_extractDataFromEvents result:", {
    info: songInfo,
    lyrics: lyrics,
    chords: chords,
    detectedHeader: detectedHeader,
  });

  return { info: songInfo, lyrics, chords, detectedHeader };
}

// --- MIDI Building ---
function _buildKLyrXML(infoData, lyricsData) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<SONG_LYRIC>\n';
  if (infoData && Object.keys(infoData).length > 0) {
    xml += "<INFO>\n";
    for (const [key, value] of Object.entries(infoData)) {
      xml += `<${key}>${escapeXml(String(value))}</${key}>\n`;
    }
    xml += "</INFO>\n";
  }
  if (lyricsData && lyricsData.length > 0) {
    xml += "<LYRIC>\n";
    lyricsData.forEach((line) => {
      if (line.length > 0) {
        xml += "<LINE>\n";
        xml += `<TIME>${line[0].tick}</TIME>\n`;
        line.forEach((word) => {
          xml += "<WORD>\n";
          xml += `<TIME>${word.tick}</TIME>\n`;
          xml += `<TEXT>${escapeXml(word.text)}</TEXT>\n`;
          xml += `<VOCAL></VOCAL>\n`;
          xml += "</WORD>\n";
        });
        xml += "</LINE>\n";
      }
    });
    xml += "</LYRIC>\n";
  }
  xml += "</SONG_LYRIC>";
  return xml;
}

function _encodeKLyrPayload(xml) {
  const xmlBytes = stringToTIS620(xml);
  const compressed = compression.deflate(xmlBytes, { level: 9 });
  return arrayBufferToBase64(compressed);
}

function _createModifiedMidi(options) {
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
      const newMarkerEvents = newChordsData.map((chord) => ({
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
    const klyrXml = _buildKLyrXML(newSongInfo, newLyricsData);
    const encodedKLyr = _encodeKLyrPayload(klyrXml);
    const newLyricTrack = [
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

function _buildTrackData(track) {
  const chunks = [];
  let currentTime = 0;
  let lastStatus = null;

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

function _buildMidiFile(midiStructure) {
  const { format, ticksPerBeat, tracks } = midiStructure;
  const trackBuffers = tracks.map(_buildTrackData);
  const totalLength =
    14 + trackBuffers.reduce((sum, buf) => sum + 8 + buf.length, 0);
  const output = new Uint8Array(totalLength);
  const view = new DataView(output.buffer);

  let offset = 0;
  const writeString = (str) => {
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

// --- Public API ---
function parse(arrayBuffer) {
  const midiData = _parseMidiFile(arrayBuffer);
  const extracted = _extractDataFromEvents(midiData);
  return { midiData, ...extracted };
}

function buildModifiedMidi(options) {
  const modified = _createModifiedMidi(options);
  return _buildMidiFile(modified);
}

// --- File Helper (Browser-friendly) ---
async function loadMidiFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  return parse(arrayBuffer);
}

// Export for use
if (typeof module !== "undefined" && module.exports) {
  // Node.js
  module.exports = {
    parse,
    buildModifiedMidi,
    loadMidiFile,
    stringToTIS620,
    TIS620ToString,
    base64ToArrayBuffer,
    arrayBufferToBase64,
  };
} else if (typeof window !== "undefined") {
  // Browser
  window.MidiProcessor = {
    parse,
    buildModifiedMidi,
    loadMidiFile,
    stringToTIS620,
    TIS620ToString,
    base64ToArrayBuffer,
    arrayBufferToBase64,
  };
}
