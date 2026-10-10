import type { PlaybackImage } from "../../stickers/types";
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

  const assets: PlaybackImage[] = [];
  xmlDoc.querySelectorAll("ASSETS ASSET").forEach((node) => {
    const id = node.getAttribute("id"), mime = node.getAttribute("mime");
    const base64 = node.querySelector("DATA")?.textContent ?? "";
    const width = Number(node.getAttribute("width")), height = Number(node.getAttribute("height"));
    if (!id || !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mime ?? "") ||
        !width || !height || width > 256 || height > 256 || width < 0 || height < 0 ||
        base64.length > 670000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) return;
    assets.push({ sticker: { id, mime: mime!, width, height, name: node.getAttribute("name") || "sticker",
      bytes: Number(node.getAttribute("bytes")) || 0, originalBytes: Number(node.getAttribute("bytes")) || 0, position: "before" }, base64 });
  });
  const byId = new Map(assets.map((asset) => [asset.sticker.id, asset.sticker]));
  const lines: LyricsWord[][] = [];
  xmlDoc.querySelectorAll("LYRIC LINE").forEach((lineNode, lineIndex) => {
    const words: LyricsWord[] = [];

    lineNode.querySelectorAll("WORD").forEach((wordNode, wordIndex) => {
      const textNode = wordNode.querySelector("TEXT");
      if (!textNode) return;

      const timeNode = wordNode.querySelector("TIME");
      const vocalNode = wordNode.querySelector("VOCAL");
      const image = wordNode.querySelector("IMAGE");
      const sticker = image ? byId.get(image.getAttribute("ref") ?? "") : undefined;
      words.push({
        id: `lyric-${lineIndex}-${wordIndex}`,
        at: parseWordAt(timeNode?.textContent, options.timeBase),
        text: sticker ? "\uFFFC" : textNode.textContent || " ",
        ...(sticker ? { kind: "image" as const, sticker } : {}),
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
    ...(assets.length ? { assets } : {}),
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
  return buildXml(document);
}

export function buildPlaybackKlyrXml(document: LyricsDocument, assets: PlaybackImage[]): string {
  // Defensively omit unused assets and collapse repeated IDs at the boundary.
  const needed = new Set(document.lines.flat().filter((word) => word.kind === "image").map((word) => word.sticker?.id));
  const unique = new Map(assets.filter((asset) => needed.has(asset.sticker.id)).map((asset) => [asset.sticker.id, asset]));
  if (needed.has(undefined) || [...needed].some((id) => !unique.has(id!))) throw new Error("missing-sticker");
  return buildXml(document, [...unique.values()]);
}

function buildXml(document: LyricsDocument, assets?: PlaybackImage[]): string {
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

  if (assets?.length) {
    xml += "  <ASSETS>\r\n";
    for (const { sticker, base64 } of assets) {
      xml += `    <ASSET id="${escapeXml(sticker.id)}" mime="${escapeXml(sticker.mime)}" name="${escapeXml(sticker.name)}" width="${sticker.width}" height="${sticker.height}" bytes="${sticker.bytes}"><DATA>${base64}</DATA></ASSET>\r\n`;
    }
    xml += "  </ASSETS>\r\n";
  }
  if (document.lines.length > 0) {
    xml += "  <LYRIC>\r\n";

    for (const sourceLine of document.lines) {
      const line = assets ? sourceLine : sourceLine.filter((word) => word.kind !== "image");
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
        xml += `        <TEXT>${escapeXml(word.kind === "image" ? " " : word.text)}</TEXT>\r\n`;
        if (word.kind === "image" && word.sticker) xml += `        <IMAGE ref="${escapeXml(word.sticker.id)}"/>\r\n`;
        xml += `        <VOCAL>${escapeXml(vocal)}</VOCAL>\r\n`;
        xml += "      </WORD>\r\n";
      }

      xml += "    </LINE>\r\n";
    }

    xml += "  </LYRIC>\r\n";
  }

  return `${xml}</SONG_LYRIC>\r\n`;
}
