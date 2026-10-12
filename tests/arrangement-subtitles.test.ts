import test from "node:test";
import assert from "node:assert/strict";
import type { LyricWordData } from "../src/types/common.type";
import { updateArrangementSubtitles, updateOggPromotion, updateArrangementEmoji } from "../src/app/arrangements/dragonforce/subtitle-update";

const effect = { type: "fire", connected: true } as const;
const original = [[
  { text: "one ", vocal: "หนึ่งสอง", at: 100, index: 0, lineIndex: 0, effect },
  { text: "two", vocal: "", at: 200, index: 1, lineIndex: 0 },
]];
const updated = [[
  { ...original[0][0], vocal: "หนึ่ง " },
  { ...original[0][1], vocal: "สอง" },
]];

test("redistribution updates captions in place while preserving all original timings and effects", () => {
  const result = updateArrangementSubtitles(original, updated);
  assert.equal(result.updated, 1);
  assert.deepEqual(result.lyricsData[0].map(word => word.vocal), ["หนึ่ง ", "สอง"]);
  assert.deepEqual(result.lyricsData[0].map(word => ({ ...word, vocal: undefined })), original[0].map(word => ({ ...word, vocal: undefined })));
  assert.equal(original[0][0].vocal, "หนึ่งสอง");
});

test("custom translations, changed timing and already distributed subtitles stay as edited", () => {
  assert.equal(updateArrangementSubtitles([[{ ...original[0][0], vocal: "คำแปลของฉัน" }, original[0][1]]], updated).updated, 0);
  assert.equal(updateArrangementSubtitles([[{ ...original[0][0], at: 110 }, original[0][1]]], updated).updated, 0);
  assert.equal(updateArrangementSubtitles(updated, updated).updated, 0);
});

test("decorative images retain their place, asset and untimed status during subtitle migration", () => {
  const image = { text: "\ufffc", kind: "image" as const, at: null, index: 2, lineIndex: 0, vocal: "", sticker: { id: "image", name: "x", mime: "image/png", width: 1, height: 1, bytes: 1, originalBytes: 1, position: "before" as const } };
  const result = updateArrangementSubtitles([[original[0][0], image, original[0][1]]], updated);
  assert.equal(result.updated, 1);
  assert.equal(result.lyricsData[0][1], image);
});

test("OGG promotion replaces only the original matching card and retains its time window", () => {
 const make = (text: string, vocal: string) => [{ text, vocal, at: 100, index: 0, lineIndex: 0 }, { text: " ", vocal: "", at: 200, index: 1, lineIndex: 0 }];
 const oldCard = make("Optimized browser playback", "ปรับระบบเพื่อการเล่นผ่านเบราว์เซอร์");
 const newCard = make("Live OGG backing tracks", "ดนตรีสดจากไฟล์อ็อกก์ประกอบการร้อง");
 const result = updateOggPromotion([oldCard, original[0]], [newCard]);
 assert.equal(result.updated, 1);assert.equal(result.lyricsData[0][0].text, "Live OGG backing tracks");
 assert.deepEqual(result.lyricsData[0].map(word => word.at), [100, 200]);
 assert.deepEqual(result.lyricsData[1].map(word => [word.text, word.at, word.vocal, word.effect]), original[0].map(word => [word.text, word.at, word.vocal, word.effect]));
 assert.equal(updateOggPromotion([make("Optimized browser playback", "คำแปลที่แก้เอง")], [newCard]).updated, 0);
});

test("intro OGG card updates its exact window without changing repeated artist or technology cards", () => {
  const old = [
    { text: "Next ", vocal: "เน็กซ์ ", at: 32000, index: 0, lineIndex: 0 },
    { text: "Karaoke", vocal: "คาราโอเกะ", at: 32800, index: 1, lineIndex: 0 },
    { text: " ", vocal: "", at: 34180, index: 2, lineIndex: 0 },
  ];
  const next = [
    { ...old[0], text: "Live music with ", vocal: "ดนตรีสดในไฟล์ " },
    { ...old[1], text: "OGG", vocal: "อ็อกก์" }, old[2],
  ];
  const other: LyricWordData[] = old.map(word => ({ ...word, at: word.at + 20000 }));
  const result = updateOggPromotion([old, other], [next]);
  assert.equal(result.updated, 1);
  assert.deepEqual(result.lyricsData[0].map(word => word.at), next.map(word => word.at));
  assert.deepEqual(result.lyricsData[1].map(word => [word.text, word.at, word.vocal, word.kind, word.effect, word.sticker]),
    other.map(word => [word.text, word.at, word.vocal, word.kind, word.effect, word.sticker]));
  assert.equal(updateOggPromotion(result.lyricsData, [next]).updated, 0);
  const image = { text: "\ufffc", kind: "image" as const, at: null, index: 3, lineIndex: 0 };
  assert.equal(updateOggPromotion([[...old, image]], [next]).updated, 0);
});

const emoji = { text: "\ufffc", kind: "image" as const, at: null, index: 2, lineIndex: 0, vocal: "", sticker: {
  id: "675cc78d7b90af6c58ba81f111d0023ee2ef11b6643b7053440d1e51784e4275", name: "Emoji — 💪.webp", mime: "image/webp", width: 128, height: 128,
  bytes: 100, originalBytes: 100, position: "after" as const,
} };
const incomingEmojiText = [[original[0][0], { ...original[0][1], text: "two💪" }]];
const clearCue = { text: " ", at: 300, index: 2, lineIndex: 0, vocal: "" };

test("legacy emoji becomes text on the preceding word before its trailing space cue", () => {
  const custom = { ...emoji, sticker: { ...emoji.sticker, id: "custom", name: "My image.webp" } };
  const current = [[original[0][0], custom, original[0][1], clearCue, emoji]];
  const result = updateArrangementEmoji(current, incomingEmojiText);
  assert.equal(result.lyricsData[0][2].text, "two💪");
  assert.equal(result.lyricsData[0][2].at, 200);
  assert.equal(result.lyricsData[0][2].vocal, original[0][1].vocal);
  assert.equal(result.lyricsData[0][0].effect, effect);
  assert.equal(result.lyricsData[0][1].sticker?.id, "custom");
  assert.equal(result.lyricsData[0].at(-1)?.text, " ");
  assert.equal(result.lyricsData[0].at(-1)?.at, 300);
  assert.deepEqual(result.lyricsData[0].map(word => word.index), [0, 1, 2, 3]);
  assert.equal(updateArrangementEmoji(result.lyricsData, incomingEmojiText).updated, 0);
});

test("older projects receive literal emoji without a separate block or timestamp", () => {
  const result = updateArrangementEmoji(original, incomingEmojiText);
  assert.equal(result.updated, 1);
  assert.equal(result.lyricsData[0].length, original[0].length);
  assert.deepEqual(result.lyricsData[0].map(word => word.text), ["one ", "two💪"]);
  assert.deepEqual(result.lyricsData[0].map(word => word.at), [100, 200]);
  assert.equal(updateArrangementEmoji(result.lyricsData, incomingEmojiText).updated, 0);
});

test("conversion preserves changed timing, translation and effect while avoiding duplicate emoji", () => {
  const edited = { ...original[0][1], text: "edited ", at: 220, vocal: "คำแปลของฉัน", effect };
  const result = updateArrangementEmoji([[original[0][0], edited, clearCue, emoji]], incomingEmojiText);
  assert.deepEqual(result.lyricsData[0][1], { ...edited, text: "edited💪" });
  const already = updateArrangementEmoji([[original[0][0], { ...edited, text: "edited💪" }, emoji]], incomingEmojiText);
  assert.equal(already.lyricsData[0][1].text, "edited💪");
  assert.equal(already.lyricsData[0].length, 2);
  assert.equal(updateArrangementEmoji([[original[0][0], edited]], incomingEmojiText).updated, 0);
});

test("a user image named Emoji remains an image unless its content hash is the generated asset", () => {
  const custom = { ...emoji, sticker: { ...emoji.sticker, id: "different-user-image" } };
  const edited = { ...original[0][1], text: "my edited words" };
  const current = [[original[0][0], edited, custom]];
  const result = updateArrangementEmoji(current, incomingEmojiText);
  assert.equal(result.updated, 0);
  assert.equal(result.lyricsData, current);
});
