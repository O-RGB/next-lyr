import { subtitleText } from "@next-karaoke/lyrics/core";
import { ArrayRange, ISentence } from "@/lib/array-range";
import { LyricWordData, MusicMode } from "@/types/common.type";
import { StoredFile } from "@/lib/database/db";
import { ParsedSongData } from "@/lib/karaoke/shared/types";
import { IMidiParseResult, TempoEvent } from "@/lib/karaoke/midi/types";
import {
  lyricsDocumentToWordData,
  parsedDataToLyricsDocument,
} from "@/lib/karaoke/lyrics-core/timeline";
import { buildKlyrXml } from "@/lib/karaoke/lyrics-core/xml";
import { normalizeChordEvents } from "@/lib/karaoke/chords/normalize";
import { LyricsPlaybackTimeline } from "./lyrics-timeline";
import {
  TickLyricSegmentGenerator,
  TimestampLyricSegmentGenerator,
} from "../../../lib/karaoke/cursor";

export const createStoredFileFromFile = async (
  file: File
): Promise<StoredFile> => {
  const buffer = await file.arrayBuffer();
  return {
    file,
    buffer,
    name: file.name,
    type: file.type,
  };
};

export const createObjectURLFromStoredFile = (
  storedFile: StoredFile
): { file: File; url: string } => {
  const file = new File([storedFile.buffer], storedFile.name, {
    type: storedFile.type,
  });
  const url = URL.createObjectURL(file);
  return { file, url };
};

export const processLyricsForPlayer = (
  lyricsData: LyricWordData[],
  mode: MusicMode,
  midi: IMidiParseResult | null
): ArrayRange<ISentence> | undefined => {
  const timedWords = lyricsData.filter((w) => w.kind !== "image" && w.at !== null);
  if (lyricsData.length === 0) return undefined;

  let timestamps: number[] = [];
  if (mode === "midi" && midi) {
    const generator = new TickLyricSegmentGenerator(midi.ticksPerBeat);
    timestamps = generator.generateSegment(timedWords);
  } else {
    const generator = new TimestampLyricSegmentGenerator();
    timestamps = generator.generateSegment(timedWords);
  }
  // Playback timing is defined only by words that already have timestamps.
  // Newly inserted words are intentionally allowed to remain untimed; they
  // must not consume characters from the generated cursor and shift every
  // timed line that follows them.
  const visibleLines = new Map<number, typeof lyricsData>();
  lyricsData.forEach((word) => {
    const line = visibleLines.get(word.lineIndex);
    if (line) line.push(word);
    else visibleLines.set(word.lineIndex, [word]);
  });

  const arrayRange = new LyricsPlaybackTimeline();
  let cursorIndex = 0;
  let previousEnd = 0;

  [...visibleLines.entries()]
    .sort(([left], [right]) => left - right)
    .forEach(([lineIndex, words]) => {
      const items = words.filter(word => word.kind !== "image" && word.at !== null);
      const line = items.map((item) => item.text).join("");
      const vocal = subtitleText(items);
      const lineLength = line.length;

      const lineCursor = lineLength ? timestamps.slice(
        cursorIndex,
        cursorIndex + lineLength + 1
      ) : [];
      if (lineLength) cursorIndex += lineLength + 1;

      const [start = previousEnd, ...valueName] = lineCursor;
      const end = valueName[lineLength - 1] || start;
      const value = {
        lineIndex,
        words,
        text: line,
        start,
        valueName,
        end,
        vocal,
      };
      arrayRange.addLine([start, end], value, lineCursor.length > 0);
      previousEnd = end;
    });

  return arrayRange;
};

export const getPreRollTime = (
  lineIndex: number,
  lyricsData: LyricWordData[]
): number => {
  if (lineIndex <= 0) return 0;

  const firstWordOfPreviousLine = lyricsData.find(
    (w) => w.lineIndex === lineIndex - 1 && w.kind !== "image" && w.at !== null
  );
  return firstWordOfPreviousLine?.at ?? 0;
};

export const convertParsedDataForImport = (
  data: ParsedSongData,
  isMidi: boolean,
  songPpq: number,
  tempos?: ArrayRange<TempoEvent>
) => {
  const document = parsedDataToLyricsDocument(data, {
    source: isMidi ? "KMID" : "MP3",
    timeBase: isMidi
      ? {
          kind: "midi-tick",
          ppq: songPpq,
          tempoChanges: tempos?.ranges.map((range) => ({
            tick: range.key[0],
            bpm: range.value.value.bpm,
          })),
        }
      : { kind: "seconds" },
  });

  const finalWords = lyricsDocumentToWordData(document, songPpq);

  const convertedChords = normalizeChordEvents(
    data.chords
      ?.map((chord) => ({
        ...chord,
        tick: isMidi ? chord.tick : chord.tick / 1000,
      }))
      .sort((a, b) => a.tick - b.tick) || [],
    isMidi ? (data as IMidiParseResult) : null
  );

  return {
    finalWords: finalWords.flat(),
    convertedChords,
    lyricsDocument: document,
    lyricsXml: data.lyricsXml ?? buildKlyrXml(document),
  };
};
