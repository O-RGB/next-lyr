import { ChordEvent, LyricEvent, SongInfo } from "../midi/types";
import { ParsedSongData } from "../shared/types";

export const DEFAULT_MISC: MiscTags = {
  MajorBrand: "dash",
  MinorVersion: 0,
  CompatibleBrands: "iso6mp41",
  EncoderSettings: "Lavf60.16.100",
};
export interface MiscTags {
  MajorBrand: string;
  MinorVersion: number;
  CompatibleBrands: string;
  EncoderSettings: string;
}

export interface IParsedMp3Data extends ParsedSongData {
  title: string;
  artist: string;
  album?: string;
  miscTags?: MiscTags;
  lyricsTagKey?: string;
}

export interface IReadMp3Result {
  parsedData: IParsedMp3Data;
  audioData: ArrayBuffer;
}
