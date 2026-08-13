import { cursorToTick } from "../cursor/units";
import type { LyricEvent, SongInfo } from "../midi/types";
import type { LyricWordData } from "@/types/common.type";
import type { ParsedSongData } from "../shared/types";
import type {
  LyricsDocument,
  LyricsSourceKind,
  LyricsTimeBase,
  LyricsWord,
} from "./types";

export function createEmptyLyricsDocument(
  source: LyricsSourceKind,
  timeBase: LyricsTimeBase,
  info: Partial<SongInfo> = {}
): LyricsDocument {
  return { source, timeBase, info, lines: [] };
}

export function parsedDataToLyricsDocument(
  data: Pick<ParsedSongData, "info" | "lyrics"> &
    Partial<Pick<ParsedSongData, "lyricsDocument">>,
  options: { source: LyricsSourceKind; timeBase: LyricsTimeBase }
): LyricsDocument {
  if (data.lyricsDocument) {
    return {
      ...data.lyricsDocument,
      source: options.source,
      timeBase: options.timeBase,
      info: { ...data.lyricsDocument.info, ...data.info },
    };
  }

  const lines: LyricsWord[][] = data.lyrics.map((line, lineIndex) =>
    line.map((word, wordIndex) => ({
      id: `lyric-${lineIndex}-${wordIndex}`,
      text: word.text,
      vocal: word.vocal,
      at:
        options.timeBase.kind === "seconds" ? word.tick / 1000 : word.tick,
    }))
  );

  return {
    source: options.source,
    timeBase: options.timeBase,
    info: data.info,
    lines,
  };
}

export function lyricsDocumentToWordData(
  document: LyricsDocument,
  _ppq: number
): LyricWordData[][] {
  let globalIndex = 0;

  return document.lines.map((line, lineIndex) =>
    line.map((word) => {
      return {
        text: word.text,
        at: word.at,
        vocal: word.vocal,
        index: globalIndex++,
        lineIndex,
      };
    })
  );
}

export function wordDataToLyricsDocument(options: {
  lyricsData: LyricWordData[][];
  source: LyricsSourceKind;
  timeBase: LyricsTimeBase;
  info: Partial<SongInfo>;
}): LyricsDocument {
  return {
    source: options.source,
    timeBase: options.timeBase,
    info: options.info,
    lines: options.lyricsData.map((line, lineIndex) =>
      line.map((word, wordIndex) => ({
        id: `lyric-${lineIndex}-${wordIndex}`,
        text: word.text,
        vocal: word.vocal,
        at: word.at,
      }))
    ),
  };
}

export function lyricsDocumentToEvents(document: LyricsDocument): LyricEvent[][] {
  return document.lines.map((line) =>
    line
      .filter((word): word is LyricsWord & { at: number } => word.at !== null)
      .map((word) => ({
        text: word.text,
        tick:
          document.timeBase.kind === "seconds" ? word.at * 1000 : word.at,
        vocal: word.vocal,
      }))
  );
}

/**
 * Build a document from a `.cur` + `.lyr` pair. `cursorUnits` are raw values
 * straight out of the cursor file, on the 24-per-beat NCN grid; they are scaled
 * here so `at` is a real MIDI tick like everywhere else.
 */
export function ncnToLyricsDocument(
  cursorUnits: number[],
  lyricLines: string[],
  info: Partial<SongInfo> = {},
  ppq = 0
): LyricsDocument {
  let cursorIndex = 0;

  return {
    source: "NCN",
    timeBase: { kind: "midi-tick", ppq },
    info,
    lines: lyricLines.slice(3).flatMap((line, lineIndex) => {
      if (line.trim() === "") return [];

      const words = (line + " ").split("").map((text, wordIndex) => ({
        id: `lyric-${lineIndex}-${wordIndex}`,
        text,
        at: (() => {
          const unit = cursorUnits[cursorIndex++];
          return unit === undefined ? null : cursorToTick(unit, ppq);
        })(),
      }));

      return [words];
    }),
  };
}
