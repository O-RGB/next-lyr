interface SearchResult extends SongDetail {
  type: number;
  fileId: string;
  from: TracklistFrom;
}

interface SongDetail {
  artist: string;
  id: string;
  name: string;
}

interface FileGroup extends Partial<SongFiles> {
  emk?: File;
}

interface SongFiltsEncodeAndDecode extends SongFilesDecode {
  encode?: SongFiles;
  emk?: File;
  error?: boolean;
}

interface SongFiles {
  mid: File;
  cur: File;
  lyr: File;
}

interface SongFilesDecode {
  mid: File;
  cur: number[];
  lyr: string[];
}

interface CursorTick {
  tick: number;
}

interface CursorList {
  tempo: number;
  ticks: CursorTick[];
}

interface DisplayLyrics {
  display: string[][];
  displayBottom: string[][];
  position: boolean;
  charIndex: number;
}

interface ValidSong {
  item: SearchResult;
  error: boolean;
  isSame: SearchResult[];
  render: ReactNode;
  originValue: SongFiltsEncodeAndDecode;
}

interface IPlayingQueues {
  songInfo: SearchResult;
  midi: MIDI;
}
interface IPlayingDecodedQueues {
  songInfo: SearchResult;
  file: SongFilesDecode;
}

interface MidiPlayingInfo {
  searchInfo: SearchResult;
  midiInfo: PlayingInfo;
}

interface PlayingInfo {
  duration: number;
}
