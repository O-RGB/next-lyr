import type { BlockEffect, PlaybackFrameAtlas } from "../../block-effects/types";
import type { LyricSticker, PlaybackImage } from "@/lib/stickers/types";
import type { SongInfo, TempoEvent } from "../midi/types";

export type LyricsSourceKind =
  | "KMID"
  | "NCN"
  | "MP3"
  | "KAR"
  | (string & {});

export type LyricsTimeBase =
  | {
      kind: "midi-tick";
      ppq: number;
      tempoChanges?: TempoEvent[];
    }
  | {
      kind: "seconds";
    };

export interface LyricsWord {
  effect?: BlockEffect;
  kind?: "text" | "image";
  sticker?: LyricSticker;
  id?: string;
  text: string;
  at: number | null;
  vocal?: string;
}

export interface LyricsDocument {
  assets?: PlaybackImage[];
  effectAtlases?: PlaybackFrameAtlas[];
  source: LyricsSourceKind;
  timeBase: LyricsTimeBase;
  info: Partial<SongInfo>;
  lines: LyricsWord[][];
}
