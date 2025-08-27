import {
  convertCursorToTick,
  processRawLyrics,
} from "../../../lib/karaoke/utils";
import { ISentence } from "../../../lib/karaoke/lyrics/types";
import { LyricsRangeArray } from "../../../lib/karaoke/lyrics/lyrics-mapping";
import {
  TickLyricSegmentGenerator,
  TimestampLyricSegmentGenerator,
} from "../../../lib/karaoke/cur-generator";
import { LyricWordData, MusicMode, IMidiInfo } from "@/types/common.type";
import { StoredFile } from "@/lib/database/db";
import { DEFAULT_PRE_ROLL_OFFSET, DEFAULT_CHORD_DURATION } from "../configs";

export const createStoredFileFromFile = async (
  file: File
): Promise<StoredFile> => {
  const buffer = await file.arrayBuffer();
  return {
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
  mode: MusicMode | null,
  midiInfo: IMidiInfo | null
): LyricsRangeArray<ISentence> | undefined => {
  const timedWords = lyricsData.filter(
    (w) => w.start !== null && w.end !== null
  );
  if (timedWords.length === 0) return undefined;

  let timestamps: number[] = [];
  if (mode === "midi" && midiInfo) {
    const generator = new TickLyricSegmentGenerator(midiInfo.bpm, midiInfo.ppq);
    timestamps = generator.generateSegment(timedWords);
  } else {
    const generator = new TimestampLyricSegmentGenerator();
    timestamps = generator.generateSegment(timedWords);
  }

  const lyrInline: string[] = [];
  lyricsData.forEach((data) => {
    if (!lyrInline[data.lineIndex]) lyrInline[data.lineIndex] = "";
    lyrInline[data.lineIndex] += data.name;
  });

  const arrayRange = new LyricsRangeArray<ISentence>();
  let cursorIndex = 0;

  lyrInline
    .map((line) => {
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
      const value = { text: line, start, valueName, end };
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

  const firstWordOfPrevLine = lyricsData.find(
    (w) => w.lineIndex === lineIndex - 1
  );
  if (
    firstWordOfPrevLine?.start !== null &&
    firstWordOfPrevLine?.start !== undefined
  ) {
    return firstWordOfPrevLine.start;
  }

  const firstWordOfCurrentLine = lyricsData.find(
    (w) => w.lineIndex === lineIndex
  );
  if (!firstWordOfCurrentLine) return 0;

  const lastTimedWordBefore = lyricsData
    .slice(0, firstWordOfCurrentLine.index)
    .filter((w) => w.end !== null)
    .pop();

  return lastTimedWordBefore?.end ?? 0;
};

export const convertParsedDataForImport = (
  data: any,
  isMidi: boolean,
  songPpq: number = 480
) => {
  if (!data.lyrics || data.lyrics.length === 0) {
    return {
      finalWords: [],
      convertedChords:
        data.chords
          ?.map((chord: any) => ({
            ...chord,
            tick: isMidi ? chord.tick : chord.tick / 1000,
          }))
          .sort((a: any, b: any) => a.tick - b.tick) || [],
    };
  }

  const finalWords: LyricWordData[] = [];
  let globalWordIndex = 0;

  const flatLyrics = data.lyrics
    .flat()
    .sort((a: any, b: any) => a.tick - b.tick);

  data.lyrics.forEach((line: any[], lineIndex: number) => {
    line.forEach((wordEvent: any) => {
      const convertedTick = isMidi
        ? convertCursorToTick(wordEvent.tick, songPpq)
        : wordEvent.tick / 1000 - DEFAULT_PRE_ROLL_OFFSET;

      const currentFlatIndex = flatLyrics.findIndex(
        (e: any) => e.tick === wordEvent.tick && e.text === wordEvent.text
      );
      const nextEvent = flatLyrics[currentFlatIndex + 1];

      let endTime: number;
      if (nextEvent) {
        endTime = isMidi
          ? convertCursorToTick(nextEvent.tick, songPpq)
          : nextEvent.tick / 1000 - DEFAULT_PRE_ROLL_OFFSET;
      } else {
        endTime = isMidi
          ? convertedTick + songPpq
          : convertedTick + DEFAULT_CHORD_DURATION;
      }

      finalWords.push({
        name: wordEvent.text,
        start: convertedTick,
        end: endTime,
        length: endTime - convertedTick,
        index: globalWordIndex++,
        lineIndex: lineIndex,
      });
    });
  });

  const convertedChords =
    data.chords
      ?.map((chord: any) => ({
        ...chord,
        tick: isMidi ? chord.tick : chord.tick / 1000,
      }))
      .sort((a: any, b: any) => a.tick - b.tick) || [];

  return { finalWords, convertedChords };
};
