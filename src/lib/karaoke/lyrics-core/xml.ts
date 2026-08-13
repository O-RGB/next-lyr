import { cursorToTick, tickToCursor } from "../cursor/units";
import type { SongInfo } from "../midi/types";
import type {
  LyricsDocument,
  LyricsSourceKind,
  LyricsTimeBase,
  LyricsWord,
} from "./types";

export interface ParseKlyrXmlOptions {
  source: LyricsSourceKind;
  timeBase: LyricsTimeBase;
}

function parseNumber(value: string | null | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Read a `<TIME>` value into the document's internal unit.
 *
 * `LyricsWord.at` is always a real MIDI tick — or seconds, for MP3-backed
 * lyrics. KLYR stores its times as NCN cursor units on a fixed 24-per-beat
 * grid, so they must be scaled by the song's PPQ on the way in. Skipping this
 * makes the lyrics run ahead of the music by a factor of `ppq / 24`, which is
 * 20x on a typical 480 PPQ song.
 */
function parseWordAt(
  value: string | null | undefined,
  timeBase: LyricsTimeBase
): number | null {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  if (timeBase.kind === "seconds") return parsed / 1000;
  return cursorToTick(parsed, timeBase.ppq);
}

export function parseKlyrXmlDocument(
  xmlDoc: Document,
  options: ParseKlyrXmlOptions
): LyricsDocument {
  const info: Partial<SongInfo> = {};
  const infoNode = xmlDoc.querySelector("INFO");

  if (infoNode) {
    for (const child of Array.from(infoNode.children)) {
      (info as Record<string, string>)[child.tagName] = child.textContent || "";
    }
  }

  const lines: LyricsWord[][] = [];
  xmlDoc.querySelectorAll("LYRIC LINE").forEach((lineNode, lineIndex) => {
    const words: LyricsWord[] = [];

    lineNode.querySelectorAll("WORD").forEach((wordNode, wordIndex) => {
      const textNode = wordNode.querySelector("TEXT");
      if (!textNode) return;

      const timeNode = wordNode.querySelector("TIME");
      const vocalNode = wordNode.querySelector("VOCAL");
      words.push({
        id: `lyric-${lineIndex}-${wordIndex}`,
        at: parseWordAt(timeNode?.textContent, options.timeBase),
        text: textNode.textContent || " ",
        vocal: vocalNode?.textContent || "",
      });
    });

    lines.push(
      words.length > 0
        ? words
        : [
            {
              id: `lyric-${lineIndex}-0`,
              at: null,
              text: " ",
              vocal: "",
            },
          ]
    );
  });

  return {
    source: options.source,
    timeBase: options.timeBase,
    info,
    lines,
  };
}

export function parseKlyrXml(
  xmlString: string,
  options: ParseKlyrXmlOptions
): LyricsDocument {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  const parserError = xmlDoc.querySelector("parsererror");

  if (parserError) {
    throw new Error("XML parsing error: " + parserError.textContent);
  }

  return parseKlyrXmlDocument(xmlDoc, options);
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (char) => {
    switch (char) {
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
        return char;
    }
  });
}

/** Inverse of {@link parseWordAt}, so a document round-trips unchanged. */
function toXmlTime(word: LyricsWord, timeBase: LyricsTimeBase): string {
  if (word.at === null) return "";
  if (timeBase.kind === "seconds") return String(Math.round(word.at * 1000));
  return String(tickToCursor(word.at, timeBase.ppq));
}

function isValidTagName(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(value);
}

export function buildKlyrXml(document: LyricsDocument): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\r\n<SONG_LYRIC>\r\n';

  const infoEntries = Object.entries(document.info).filter(
    ([key, value]) => isValidTagName(key) && value !== "" && value !== undefined
  );

  if (infoEntries.length > 0) {
    xml += "  <INFO>\r\n";
    for (const [key, value] of infoEntries) {
      xml += `    <${key}>${escapeXml(String(value))}</${key}>\r\n`;
    }
    xml += "  </INFO>\r\n";
  }

  if (document.lines.length > 0) {
    xml += "  <LYRIC>\r\n";

    for (const line of document.lines) {
      if (line.length === 0) continue;

      xml += "    <LINE>\r\n";
      if (document.timeBase.kind === "midi-tick") {
        xml += `      <TIME>${toXmlTime(line[0], document.timeBase)}</TIME>\r\n`;
      }

      for (const word of line) {
        const vocal =
          document.timeBase.kind === "midi-tick" &&
          (word.vocal === "9" || word.vocal === "NONE")
            ? ""
            : word.vocal ?? "";

        xml += "      <WORD>\r\n";
        xml += `        <TIME>${toXmlTime(word, document.timeBase)}</TIME>\r\n`;
        xml += `        <TEXT>${escapeXml(word.text)}</TEXT>\r\n`;
        xml += `        <VOCAL>${escapeXml(vocal)}</VOCAL>\r\n`;
        xml += "      </WORD>\r\n";
      }

      xml += "    </LINE>\r\n";
    }

    xml += "  </LYRIC>\r\n";
  }

  return `${xml}</SONG_LYRIC>\r\n`;
}
