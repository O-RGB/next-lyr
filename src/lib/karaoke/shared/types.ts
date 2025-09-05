import { SongInfo, LyricEvent, ChordEvent } from "../midi/types";

export interface ParsedSongData {
  info: SongInfo;
  lyrics: LyricEvent[][];
  chords: ChordEvent[];
}
