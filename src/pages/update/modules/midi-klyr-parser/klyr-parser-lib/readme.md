# MIDI KLyr Parser

A JavaScript/TypeScript library for parsing and editing MIDI files with Thai lyrics and chord data in KLyr format. This library supports TIS-620 encoding and can extract/modify song information, lyrics, and chords from MIDI files.

## Features

- 🎵 Parse MIDI files with embedded Thai lyrics
- 🎸 Extract and modify chord markers
- 📝 Handle song metadata (title, artist, etc.)
- 🔤 Full TIS-620 encoding support
- 💾 Save modified MIDI files
- 📦 ES6 modules with TypeScript support
- 🏗️ Object-oriented and functional API

## Installation

```bash
npm install midi-klyr-parser
```

## Usage

### Basic Usage

```javascript
import MidiKLyrParser, { parseMidiFile } from 'midi-klyr-parser';

// Read MIDI file (assuming you have file data as ArrayBuffer)
const fileBuffer = await file.arrayBuffer();

// Parse the file
const result = parseMidiFile(fileBuffer);

console.log('Song Info:', result.info);
console.log('Lyrics:', result.lyrics);
console.log('Chords:', result.chords);
console.log('MIDI Data:', result.midiData);
```

### Object-Oriented Usage

```javascript
import MidiKLyrParser from 'midi-klyr-parser';

const parser = new MidiKLyrParser();
const result = parser.parseFile(fileBuffer);

// Modify data
result.info.TITLE = 'New Song Title';
result.info.ARTIST = 'New Artist';

// Add new chord
result.chords.push({
  chord: 'Am',
  tick: 1920
});

// Save modified MIDI
const modifiedMidiBuffer = parser.saveMidi(
  result.info,
  result.lyrics,
  result.chords
);

// Convert to blob for download
const blob = new Blob([modifiedMidiBuffer], { type: 'audio/midi' });
```

### Browser File Handling

```javascript
// Handle file input
document.getElementById('fileInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const buffer = await file.arrayBuffer();
  const result = parseMidiFile(buffer);
  
  // Display results
  console.log('Parsed MIDI:', result);
});
```

## API Reference

### Types

```typescript
interface LyricEvent {
  text: string;
  tick: number;
  vocal?: string;
}

interface ChordEvent {
  chord: string;
  tick: number;
}

type SongInfo = Record<string, string>;

interface ParseResult {
  midiData: MidiFile;
  info: SongInfo;
  lyrics: LyricEvent[][];
  chords: ChordEvent[];
  detectedHeader: string;
}
```

### MidiKLyrParser Class

#### Methods

- `parseFile(buffer: ArrayBuffer): ParseResult` - Parse MIDI file and return all data
- `saveMidi(info: SongInfo, lyrics: LyricEvent[][], chords: ChordEvent[]): ArrayBuffer` - Generate modified MIDI file

### Utility Functions

- `parseMidiFile(buffer: ArrayBuffer): ParseResult` - Quick parse function
- `saveMidiFile(parser: MidiKLyrParser, info: SongInfo, lyrics: LyricEvent[][], chords: ChordEvent[]): ArrayBuffer` - Quick save function

## Data Formats

### Song Info
```javascript
{
  "TITLE": "Song Title",
  "ARTIST": "Artist Name",
  "ALBUM": "Album Name",
  // ... other metadata
}
```

### Lyrics Structure
```javascript
[
  [ // Line 1
    { text: "Hello", tick: 0, vocal: "" },
    { text: "World", tick: 480, vocal: "" }
  ],
  [ // Line 2
    { text: "How", tick: 960, vocal: "" },
    { text: "are", tick: 1440, vocal: "" },
    { text: "you", tick: 1920, vocal: "" }
  ]
]
```

### Chords Structure
```javascript
[
  { chord: "C", tick: 0 },
  { chord: "Am", tick: 960 },
  { chord: "F", tick: 1920 },
  { chord: "G", tick: 2880 }
]
```

## Dependencies

- **pako**: For gzip compression/decompression of lyric data

## Browser Compatibility

- ES6+ compatible browsers
- Support for ArrayBuffer, DataView, DOMParser
- Requires pako library for compression

## License

MIT License

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository.