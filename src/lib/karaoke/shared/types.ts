import { SongInfo, LyricEvent, ChordEvent } from "../midi/types";
import type { LyricsDocument } from "../lyrics-core/types";

export interface ParsedSongData {
  info: SongInfo;
  lyrics: LyricEvent[][];
  chords: ChordEvent[];
  lyricsDocument?: LyricsDocument;
  lyricsXml?: string;
}
