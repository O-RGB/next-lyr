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
  const timedWords = lyricsData.filter((w) => w.at !== null);
  if (timedWords.length === 0) return undefined;

  let timestamps: number[] = [];
  if (mode === "midi" && midi) {
    const generator = new TickLyricSegmentGenerator(midi.ticksPerBeat);
    timestamps = generator.generateSegment(timedWords);
  } else {
    const generator = new TimestampLyricSegmentGenerator();
    timestamps = generator.generateSegment(timedWords);
  }
  const lyrInline: string[] = [];
  const vocalInline: string[] = [];

  const grouped: Record<number, typeof lyricsData> = {};
  lyricsData.forEach((data) => {
    if (!grouped[data.lineIndex]) grouped[data.lineIndex] = [];
    grouped[data.lineIndex].push(data);
  });

  Object.keys(grouped).forEach((line) => {
    const items = grouped[Number(line)];
    lyrInline[Number(line)] = items.map((i) => i.text).join("");
    vocalInline[Number(line)] = items
      .map((i, idx) => {
        if (!i.vocal) return "";

        const isLastWithVocal = items.slice(idx + 1).every((j) => !j.vocal);
        return i.vocal + (isLastWithVocal ? "" : "-");
      })
      .join("");
  });

  const arrayRange = new ArrayRange<ISentence>();
  let cursorIndex = 0;

  lyrInline
    .map((line, index) => {
      const lineLength = line.length;
      if (lineLength === 0) return undefined;

      const lineCursor = timestamps.slice(
        cursorIndex,
        cursorIndex + lineLength + 1
      );
      cursorIndex += lineLength + 1;
      if (!lineCursor.length) return undefined;

      const [start, ...valueName] = lineCursor;
      const end = valueName[lineLength - 1] || start;
      const value = {
        text: line,
        start,
        valueName,
        end,
        vocal: vocalInline[index],
      };
      arrayRange.push([start, end], value);
      return value;
    })
    .filter((x) => x !== undefined);

  return arrayRange;
};

export const getPreRollTime = (
  lineIndex: number,
  lyricsData: LyricWordData[]
): number => {
  if (lineIndex <= 0) return 0;

  const firstWordOfPreviousLine = lyricsData.find(
    (w) => w.lineIndex === lineIndex - 1
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

  const convertedChords =
    data.chords
      ?.map((chord) => ({
        ...chord,
        tick: isMidi ? chord.tick : chord.tick / 1000,
      }))
      .sort((a, b) => a.tick - b.tick) || [];

  return {
    finalWords: finalWords.flat(),
    convertedChords,
    lyricsDocument: document,
    lyricsXml: data.lyricsXml ?? buildKlyrXml(document),
  };
};
