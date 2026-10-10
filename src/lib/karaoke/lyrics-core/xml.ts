import { normalizeBlockEffect, type EffectAtlasRole, type PlaybackFrameAtlas } from "../../block-effects/types";
import { EFFECT_RENDERER, EFFECT_LAYOUT, EFFECT_COMMON, effectRecipe } from "../../block-effects/catalog";
import { selectPlaybackAtlases } from "../../block-effects/assets";
import { EFFECT_ANIMATION_CSS } from "../../block-effects/animation";
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
  const effectAtlases: PlaybackFrameAtlas[] = [];
  const spritePayloads=new Map<string,string>();
  xmlDoc.querySelectorAll("EFFECTS SPRITE").forEach(node=>{const data=node.querySelector("DATA");if(data?.textContent)spritePayloads.set(node.getAttribute("id")??"",data.textContent);});
  xmlDoc.querySelectorAll("EFFECTS SPRITE").forEach((node) => {
    const type = normalizeBlockEffect({ type: node.getAttribute("type") })?.type;
    const role = node.getAttribute("role") ?? "edge";
    const data=node.querySelector("DATA");
    const base64=data?.textContent||spritePayloads.get(data?.getAttribute("ref")??"")||"";
    const width = Number(node.getAttribute("width")), height = Number(node.getAttribute("height"));
    const columns = Number(node.getAttribute("columns")), rows = Number(node.getAttribute("rows"));
    const frames = Number(node.getAttribute("frames")), fps = Number(node.getAttribute("fps"));
    if (!type || !["edge", "base", "cloud", "lightning", "birds"].includes(role) || (role === "base" && type !== "fire") || (role === "cloud" && type !== "rain" && type !== "sunny") || (role === "lightning" && type !== "rain") || (role === "birds" && type !== "sunny") || node.getAttribute("mime") !== "image/png" || !Number.isInteger(width) || !Number.isInteger(height) ||
      width <= 0 || height <= 0 || width > 4096 || height > 4096 || columns !== 4 || rows !== 4 || width < columns || height < rows ||
      frames !== 16 || !Number.isFinite(fps) || fps < 1 || fps > 60 || base64.length > 10000000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return;
    effectAtlases.push({ type, ...(role !== "edge" ? { role: role as EffectAtlasRole } : {}), id: node.getAttribute("id") ?? type, mime: "image/png", width, height, columns, rows, frames, fps, base64 });
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
      const effectNode = wordNode.querySelector("EFFECT");
      const effect = normalizeBlockEffect({ type: effectNode?.getAttribute("type"), variant: effectNode?.getAttribute("variant"), connected: effectNode?.getAttribute("connected") !== "false" });
      const image = wordNode.querySelector("IMAGE");
      const sticker = image ? byId.get(image.getAttribute("ref") ?? "") : undefined;
      words.push({
        id: `lyric-${lineIndex}-${wordIndex}`,
        at: parseWordAt(timeNode?.textContent, options.timeBase),
        text: sticker ? "\uFFFC" : textNode.textContent || " ",
        ...(effect ? { effect } : {}),
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
    ...(effectAtlases.length ? { effectAtlases } : {}),
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

export function buildPlaybackKlyrXml(document: LyricsDocument, assets: PlaybackImage[], effectAtlases: PlaybackFrameAtlas[] = []): string {
  // Defensively omit unused assets and collapse repeated IDs at the boundary.
  const needed = new Set(document.lines.flat().filter((word) => word.kind === "image").map((word) => word.sticker?.id));
  const unique = new Map(assets.filter((asset) => needed.has(asset.sticker.id)).map((asset) => [asset.sticker.id, asset]));
  if (needed.has(undefined) || [...needed].some((id) => !unique.has(id!))) throw new Error("missing-sticker");
  return buildXml(document, [...unique.values()], selectPlaybackAtlases(document.lines,effectAtlases));
}

function buildXml(document: LyricsDocument, assets?: PlaybackImage[], effectAtlases?: PlaybackFrameAtlas[]): string {
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

  const effects = [...new Set(document.lines.flat().flatMap((word) => {
    const effect = normalizeBlockEffect(word.effect); return effect ? [effect.type] : [];
  }))];
  if (effects.length) {
    xml += `  <EFFECTS renderer="${EFFECT_RENDERER}">\r\n    <LAYOUT>${escapeXml(JSON.stringify(EFFECT_LAYOUT))}</LAYOUT>\r\n    <COMMON>${escapeXml(JSON.stringify(EFFECT_COMMON))}</COMMON>\r\n    <STYLE>${escapeXml(EFFECT_ANIMATION_CSS)}</STYLE>\r\n`;
    for (const type of effects) xml += `    <PRESET id="${type}"><DATA>${escapeXml(JSON.stringify(effectRecipe(type)))}</DATA></PRESET>\r\n`;
    for (const atlas of effectAtlases ?? []) xml += `    <SPRITE type="${atlas.type}" role="${atlas.role ?? "edge"}" id="${escapeXml(atlas.id)}" mime="${atlas.mime}" width="${atlas.width}" height="${atlas.height}" columns="${atlas.columns}" rows="${atlas.rows}" frames="${atlas.frames}" fps="${atlas.fps}">${atlas.base64?`<DATA>${atlas.base64}</DATA>`:`<DATA ref="${escapeXml(atlas.id)}"/>`}</SPRITE>\r\n`;
    xml += "  </EFFECTS>\r\n";
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
        const effect = normalizeBlockEffect(word.effect);
        if (effect) xml += `        <EFFECT type="${effect.type}"${effect.variant?` variant="${effect.variant}"`:""} connected="${effect.connected}"/>\r\n`;
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
