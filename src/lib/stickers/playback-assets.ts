import type { LyricsDocument } from "../karaoke/lyrics-core/types";
import type { LyricSticker, PlaybackImage } from "./types";

/** Only placed images are included, never the rest of the session gallery. */
export async function collectPlaybackAssets(document: LyricsDocument,
  load: (id: string) => Promise<Blob | undefined>): Promise<PlaybackImage[]> {
  const unique = new Map<string, LyricSticker>();
  for (const word of document.lines.flat()) {
    if (word.kind !== "image") continue;
    if (!word.sticker) throw new Error("missing-sticker");
    unique.set(word.sticker.id, word.sticker);
  }
  const assets: PlaybackImage[] = [];
  for (const sticker of unique.values()) {
    const blob = await load(sticker.id);
    if (!blob) throw new Error(`missing-sticker: ${sticker.name}`);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    assets.push({ sticker, base64: btoa(binary) });
  }
  return assets;
}

/** Keep YKR's playback envelope, without project/editor/history data. */
export function buildYoutubePlayback(input: {
  youtubeId: string; info: LyricsDocument["info"]; lyrics: unknown; chords: unknown;
  document: LyricsDocument; assets: PlaybackImage[];
}) {
  return { format: "ykr", version: 2, mode: "youtube", data: {
    playerState: { youtubeId: input.youtubeId }, metadata: input.info,
    newLyricsData: input.lyrics, chordsData: input.chords,
    lyricsDocument: { ...input.document, assets: undefined }, assets: input.assets,
  } };
}
