import { ArrayRange, ISentence } from "@/lib/utils/arrayrange";
import {
  cursorToTick,
  TickLyricSegmentGenerator,
  TimestampLyricSegmentGenerator,
} from "../../../lib/karaoke/cursor";
import { LyricWordData, MusicMode, IMidiInfo } from "@/types/common.type";
import { StoredFile } from "@/lib/database/db";
import {
  DEFAULT_PRE_ROLL_OFFSET_MP3,
  DEFAULT_CHORD_DURATION,
  DEFAULT_PRE_ROLL_OFFSET_MIDI,
} from "../configs";
import { ParsedSongData } from "@/lib/karaoke/shared/types";
import { IMidiParseResult, TempoEvent } from "@/lib/karaoke/midi/types";

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
  const timedWords = lyricsData.filter(
    (w) => w.start !== null && w.end !== null
  );
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
  lyricsData.forEach((data) => {
    if (!lyrInline[data.lineIndex]) lyrInline[data.lineIndex] = "";
    lyrInline[data.lineIndex] += data.name;
  });

  const arrayRange = new ArrayRange<ISentence>();
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
  data: ParsedSongData,
  isMidi: boolean,
  songPpq: number,
  tempos?: ArrayRange<TempoEvent>
) => {
  if (!data.lyrics || data.lyrics.length === 0) {
    return {
      finalWords: [],
      convertedChords:
        data.chords
          ?.map((chord) => ({
            ...chord,
            tick: isMidi ? chord.tick : chord.tick / 1000,
          }))
          .sort((a, b) => a.tick - b.tick) || [],
    };
  }

  const finalWords: LyricWordData[] = [];
  let globalWordIndex = 0;

  const flatLyrics = data.lyrics.flat().sort((a, b) => a.tick - b.tick);

  // isMidi มีการ Build ออกมาแล้วคลาดเคลื่อนนิดหน่อยต้อง - จาก 0.4 ด้วย 0.35
  data.lyrics.forEach((line, lineIndex: number) => {
    line.forEach((wordEvent) => {
      const bpm = isMidi ? tempos!.search(wordEvent.tick)?.lyrics.value.bpm : 0;

      const offsetTicks = isMidi
        ? (DEFAULT_PRE_ROLL_OFFSET_MIDI * songPpq * bpm!) / 60
        : DEFAULT_PRE_ROLL_OFFSET_MP3;

      const baseTick = isMidi
        ? cursorToTick(wordEvent.tick, songPpq)
        : wordEvent.tick / 1000;

      const convertedTick = Math.max(0, baseTick - offsetTicks);

      const currentFlatIndex = flatLyrics.findIndex(
        (e) => e.tick === wordEvent.tick && e.text === wordEvent.text
      );
      const nextEvent = flatLyrics[currentFlatIndex + 1];

      let endTime: number;
      if (nextEvent) {
        const nextBaseTick = isMidi
          ? cursorToTick(nextEvent.tick, songPpq)
          : nextEvent.tick / 1000;
        endTime = Math.max(0, nextBaseTick - offsetTicks);
      } else {
        const duration = isMidi ? songPpq : DEFAULT_CHORD_DURATION;
        endTime = convertedTick + duration;
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
      ?.map((chord) => ({
        ...chord,
        tick: isMidi ? chord.tick : chord.tick / 1000,
      }))
      .sort((a, b) => a.tick - b.tick) || [];

  return { finalWords, convertedChords };
};
