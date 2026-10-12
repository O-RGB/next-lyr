# Through the Fire and Flames — Retimed Solo Show

User-supplied `DT0001.mid` is untouched.

- All primary text is English; every nonblank lyric and instrumental display line has a Thai translation in its Subtitle/VOCAL field.
- All 384 source singing words preserved, split into 95 short, meaningful lines (32 characters maximum).
- 28 instrumental cards, shown as 54 short English lines with Thai subtitles. Promotion focuses on the browser engine, Multi-SF2, WebAssembly, lyrics/images/effects. Most remaining cards celebrate the band or prepare the singer.
- Timing reference: channel 5, ZP Theart (Vocals), 506 unique note onsets. Repeated choruses share syllable assignments. Alignment uses the supplied MIDI score, not a commercial vocal recording.
- All 12 music tracks preserved byte-for-byte, including 200 → 170 → 200 BPM tempo changes.
- Instrumental messages leave at least 3 seconds before the next vocal entrance. Ordinary space-only cues clear the display and hold final syllables.
- Two transparent WebP assets, 32,190 bytes total, reused in 10 positions. They are embedded only once each; image blocks remain untimed.
- Effect IDs reference @next-karaoke/lyrics 0.2.6; no sprite-sheet binaries are embedded.
- Fixed active-line selection: a new first-word cue takes ownership immediately, even when the generated tail of the previous line overlaps. This prevents a future line from wiping early and resetting.

Open `http://localhost:3001/arrangements/dragonforce`. The page creates/reopens the project in the current browser. This distributes a complete playback MIDI only; no project archive.

## File verification

```json
{
  "sourceSha256": "8580c8f69aa671a1794fc75283a9ab5f11e4d3ae4c9ae4cdbf8d3ee6460b36a2",
  "outputSha256": "50abf1b5bbebadfc61d6041a47f2c7f24604fa4a365ee5c42c494f0c211c25a8",
  "originalBytes": 175417,
  "outputBytes": 226558,
  "unchangedMusicTracks": 12,
  "changedTracks": [
    "@LYRIC"
  ],
  "ppq": 480,
  "tempoChangesUnchanged": true
}
```

## Instrumental cards

| Start | End | English | Thai subtitle |
|---|---|---|---|
| 0.80s | 2.29s | DragonForce | ดราก้อนฟอร์ซ |
| 2.29s | 6.60s | Through the Fire and Flames | ฝ่าเปลวไฟที่โหมกระหน่ำ |
| 7.30s | 8.88s | Twin guitars. | สองกีตาร์ประสานกัน |
| 8.88s | 12.70s | One unstoppable sound! | พลังเสียงที่ไม่มีสิ่งใดหยุดได้ |
| 13.50s | 15.21s | Next Karaoke | เน็กซ์ คาราโอเกะ |
| 15.21s | 18.90s | MIDI Player Online | เครื่องเล่นมิดี้ออนไลน์ |
| 20.00s | 21.37s | Next Karaoke | เน็กซ์ คาราโอเกะ |
| 21.37s | 25.80s | Built for browser performance | สร้างเพื่อพลังการเล่นผ่านเบราว์เซอร์ |
| 27.00s | 29.68s | Herman Li & Sam Totman | เฮอร์แมน ลี และแซม ท็อตแมน |
| 29.68s | 32.80s | Full speed ahead! | พุ่งไปข้างหน้าเต็มความเร็ว |
| 115.00s | 117.18s | Powerful vocals. | เสียงร้องทรงพลัง |
| 117.18s | 121.00s | Relentless guitars! | กีตาร์พุ่งไม่หยุด |
| 122.30s | 124.38s | NextLyricsEditor | เน็กซ์ ลิริกส์ เอดิเตอร์ |
| 124.38s | 128.30s | Create the performance. | สร้างเนื้อร้องให้เป็นการแสดงในแบบคุณ |
| 201.30s | 208.10s | Two guitars. Zero hesitation. | สองกีตาร์ เดือดเต็มที่ไม่มีลังเล |
| 209.40s | 211.94s | Catch your breath. | พักหายใจสักนิด |
| 211.94s | 216.00s | The chant is coming! | ท่อนร้องรับกำลังมา |
| 240.00s | 242.38s | The solo begins. | เข้าสู่ช่วงโซโล่ |
| 242.38s | 246.80s | Let the guitars speak. | ปล่อยให้กีตาร์เล่าเรื่อง |
| 247.80s | 249.33s | ZP Theart | ซีพี เธียร์ต |
| 249.33s | 254.60s | A voice that lifts the song | พลังเสียงที่พาเพลงทะยาน |
| 255.60s | 257.23s | Herman Li | เฮอร์แมน ลี |
| 257.23s | 262.40s | Every note hits with power | ทุกโน้ตเต็มไปด้วยพลัง |
| 263.40s | 265.14s | Sam Totman | แซม ท็อตแมน |
| 265.14s | 270.20s | Sharp. Fast. Fearless. | คม ชัด เร็ว และไร้ความกลัว |
| 271.20s | 278.00s | Two guitars trading pure energy | สองกีตาร์ส่งต่อพลังกันเต็มที่ |
| 279.00s | 281.61s | Multi-SF2 power | พลังจากซาวด์ฟอนต์หลายชุด |
| 281.61s | 285.80s | One browser stage. | รวมอยู่บนเวทีในเบราว์เซอร์เดียว |
| 286.80s | 289.04s | Bass & drums | เบสและกลองประสานกัน |
| 289.04s | 293.60s | Driving every strike | ขับพลังให้ทุกจังหวะ |
| 294.60s | 296.61s | Vadim Pruzhanov | วาดิม ปรูชานอฟ |
| 296.61s | 301.40s | Keys cutting through the fire | คีย์บอร์ดทะยานผ่านเปลวไฟ |
| 302.40s | 304.90s | WebAssembly MIDI engine | ระบบมิดี้บนเว็บแอสเซมบลี |
| 304.90s | 309.20s | Built for browser performance | สร้างเพื่อพลังการเล่นผ่านเบราว์เซอร์ |
| 310.20s | 313.28s | Lyrics. Images. Effects. | เนื้อร้อง ภาพ และเอฟเฟกต์ |
| 313.28s | 317.00s | One powerful canvas. | รวมพลังไว้บนแคนวาสเดียว |
| 318.00s | 319.74s | ZP Theart | ซีพี เธียร์ต |
| 319.74s | 324.80s | Singing above the storm | เสียงร้องทะยานเหนือพายุ |
| 325.80s | 329.16s | Herman Li & Sam Totman | เฮอร์แมน ลี และแซม ท็อตแมน |
| 329.16s | 332.60s | Twin guitar fire | สองกีตาร์ลุกเป็นไฟ |
| 333.60s | 336.59s | Optimized browser playback | ปรับระบบเพื่อการเล่นผ่านเบราว์เซอร์ |
| 336.59s | 340.40s | Every note. Every frame. | ใส่ใจทุกโน้ตและทุกเฟรม |
| 341.40s | 344.53s | Guitars. Bass. Keys. Drums. | กีตาร์ เบส คีย์บอร์ด และกลอง |
| 344.53s | 348.20s | One unstoppable band. | รวมกันเป็นพลังที่ไม่มีใครหยุดได้ |
| 350.00s | 351.53s | Get ready. | เตรียมพร้อมไว้ |
| 351.53s | 356.80s | The final vocals are coming! | ท่อนร้องสุดท้ายกำลังมา |
| 404.00s | 406.62s | Last chorus done. | ท่อนฮุกสุดท้ายจบแล้ว |
| 406.62s | 410.80s | The guitars play on! | แต่กีตาร์ยังเดือดต่อ |
| 412.00s | 413.71s | DragonForce | ดราก้อนฟอร์ซ |
| 413.71s | 418.80s | Speed. Power. No surrender. | รวดเร็ว ทรงพลัง และไม่ยอมแพ้ |
| 420.00s | 422.28s | Next Karaoke | เน็กซ์ คาราโอเกะ |
| 422.28s | 426.80s | NextLyricsEditor | เน็กซ์ ลิริกส์ เอดิเตอร์ |
| 429.00s | 432.45s | Thanks for the ride! | ขอบคุณที่ร่วมเดือดไปด้วยกัน |
| 432.45s | 436.50s | NextFeeder Labs | เน็กซ์ฟีดเดอร์ แลบส์ |

## Generated assets and final prompts

Built-in imagegen mode, transparent output. Saved assets: `solo-guitars.webp` (256×171) and `dragon-crest.webp` (256×236). Originals remain in Codex generated_images.

Guitars prompt:
Create one small reusable transparent-background sticker for a power metal karaoke solo break. A compact crest formed by two angular electric guitar silhouettes crossed diagonally, one restrained orange flame accent and one cyan lightning accent. Modern clean graphic art, bold broad readable shapes, just a few flat colors, dark navy outlines, tiny hint of dimensional shading, serious concert energy. No cute cartoon faces, no text, no letters, no logo, no brand, no circular badge, no background, no drop shadow outside the illustration. Short compact silhouette, generous empty transparent margin, designed to remain legible at 32 to 48 pixels. Polished intentional artist-made appearance, minimal detail.

Dragon prompt:
One compact transparent-background power metal karaoke sticker: a proud winged dragon in a bold three-quarter silhouette, wings sweeping upward and curling into one short orange flame arc. Modern minimal fantasy graphic illustration, serious heroic energy, sharp clean navy outlines, deep blue dragon with cyan highlights, only a few orange and golden flame shapes. A tiny hint of dimensional shading, broad chunky shapes, no scales or tiny detail, no cute cartoon face, no realistic texture, no glowing haze. Balanced compact icon composition that reads clearly at 32 to 48 pixels. No words, no letters, no logo, no frame, no badge, no scenery, no background, generous transparent margin.

## Final checks

- 45 timing/workflow regression tests passed, including overlapping line-tail ownership.
- Production build, TypeScript, and targeted ESLint passed.
- Mobile 390px live playback crossed eleven cue transitions with no early wiping of future rows; every one of the 154 start boundaries selected the correct line.
- Actual app export reimport validation preserved all primary text, Thai subtitles, effects and timestamps, with two SHA-256-verified assets referenced ten times.
- Setup-link revisit reopened the same saved project.

## Subtitle update

Thai translations are now spread over phrase anchors in 143 multi-word rows. Explicit spaces preserve natural phrases; legacy romanized subtitles retain hyphen separators. Primary lyrics, timestamps, images and effects have the same SHA-256 before/after the project update. Custom user translations and changed timings are preserved.

Unstyled subtitles use orange/black before singing and blue/white afterward. Effect subtitles share the primary effect fill palette, with black idle and white sung outlines. No extra subtitle effect icons/sprites. Measured glyph descenders/ascenders leave a small 1.5px minimum gap; both lyric rows are closer together. All 153 adjacent pairs remain inside the 390px mobile preview. The common renderer is @next-karaoke/lyrics 0.2.6 in both hosts. Package 28 checks, editor 48 workflow/migration checks, shared player browser integration, TypeScript and production build passed. Actual app MIDI export preserves every subtitle fragment.

## Audible lyric clock update

Next Karaoke's Lyrics now consume the latency-compensated presentation clock rather than the ahead-of-audio sequencer clock. The original raw clock, BPM/measure/beat calculations and stamping/scheduling references remain unchanged. A bundled versioned worker keeps the clock protocol synchronized with the app. Golden worker comparisons passed through 200 → 170 → 200 BPM, seek, handoff and restart.

Both hosts now use @next-karaoke/lyrics 0.2.7, sharing the existing editor MIDI word-to-character curve. Live comparison of this file matched every one of its 149 nonblank display rows; actual playback confirmed Canvas followed presentation ticks with zero mismatches. On the test device, the raw sequencer lead was about 390ms at a 16,384-frame buffer.

Unstyled subtitle orange is slightly lighter (#E7753E). Two promotion rows now read “Live OGG backing tracks” and “Real sound. Browser power.” with Thai subtitles. This remains a MIDI playback file; live OGG stems will be added to NKML separately. Actual app export preserves the live workspace's text, subtitles, timestamps, images and effect membership.

## OGG intro and emoji decoration update

OGG live backing-track promotion now also appears at 20.00–25.80 seconds: “Live music with OGG” / “Recorded live. Played online.” with Thai subtitles. The existing OGG solo card at 333.60–340.40 seconds remains.

Eight sparse emoji placements follow the song's emotional moments: strength, sundown, heart, heartbreak, sadness and the chant/finale. Six transparent 128px WebP emoji assets total 18,876 bytes; repeated emoji reuse one asset. They are untimed image blocks rendered inside the existing lyric Canvas, with no new timer, worker or animation loop. Original 384 singing words and their timestamps are unchanged. All 12 music tracks remain byte-for-byte identical to the source.

The setup link updates the existing project in place (revision ogg-intro-and-emoji-v5), retains edited rows, preserves existing images and effects, and stores the used emoji assets once in the shared gallery.

Validation for v5: 7 migration checks, targeted ESLint, TypeScript and production build passed. Actual 390px mobile Preview displays the new intro and small emoji. Actual app MIDI export matches all 154 live rows, retains all original text/subtitle/timing/effect/image data, and embeds 8 unique images for 18 placements.

## Literal text emoji correction (v6)

All eight emoji are now literal Unicode appended directly to their original word, for example `pain💔`, before the trailing clear/space cue. No separate block or timestamp is added. The six emoji image payloads are removed from playback export; only the two original artwork assets remain. Word timestamps, subtitles, text effect membership, clear cues, line count and all 12 music tracks are unchanged. The common Canvas renderer draws the emoji as text.

Validation for v6: 9 migration checks, targeted ESLint, TypeScript and production build passed. Actual 390px mobile Preview draws `pain💔` as one text block with zero image placements for that line. Actual MIDI export matches all 154 live rows and contains eight literal emoji, no emoji image payload, and only the two original artwork assets.
