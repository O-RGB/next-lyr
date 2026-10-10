import test from "node:test";
import assert from "node:assert/strict";
import { moveCellContent, cellsFromLine, migrateInlineStickers, collectInlineStickers, IMAGE_TOKEN } from "../src/lib/karaoke/inline-content.ts";

const sticker = { id:"asset",name:"test.png",mime:"image/png",width:24,height:24,bytes:100,originalBytes:200,position:"before" };
const line = ["A","B","C"].map((text,index) => ({text,at:index+1,index,lineIndex:0}));

test("move C before A, retaining the destination timing slot indexes", () => {
  const cells = cellsFromLine(line), moved = moveCellContent(cells,2,0);
  assert.deepEqual(moved.map(c=>c.text),["C","A","B"]);
  assert.deepEqual(moved.map(c=>c.originalIndex),[0,1,2]);
  assert.deepEqual(cells.map(c=>c.text),["A","B","C"]);
});
test("image content can move between words, while the untimed slot remains in place", () => {
  const cells = [...cellsFromLine(line),{key:"image",originalIndex:null,kind:"image",text:IMAGE_TOKEN,vocal:"",sticker}];
  const moved = moveCellContent(cells,3,1);
  assert.deepEqual(moved.map(c=>c.kind),["text","image","text","text"]);
  assert.deepEqual(moved.map(c=>c.originalIndex),[0,1,2,null]);
  assert.equal(moved[1].sticker.id,"asset");
});
test("subtitles follow the word content, never the timestamp slot", () => {
  const cells=cellsFromLine(line);cells[0].vocal="AY";cells[2].vocal="SEE";
  const moved=moveCellContent(cells,2,0);
  assert.deepEqual(moved.map(c=>c.vocal),["SEE","AY",""]);
  assert.deepEqual(moved.map(c=>c.originalIndex),[0,1,2]);
});
test("upgrade an existing edge sticker without losing the original text timestamps", () => {
  const upgraded=migrateInlineStickers([line],{0:sticker});
  assert.equal(upgraded[0][0].kind,"image");
  assert.deepEqual(upgraded[0].filter(w=>w.kind!=="image").map(w=>w.at),[1,2,3]);
  assert.equal(upgraded[0][0].at,1);
});
test("legacy migration is idempotent, including a timestamp of zero", () => {
  const zero=[{...line[0],at:0}];const once=migrateInlineStickers([zero],{0:sticker});
  assert.equal(once[0][0].at,0);
  assert.equal(migrateInlineStickers(once,{0:sticker})[0].length,2);
});
test("asset cleanup retains images at arbitrary inline positions", () => {
  const image={...line[1],kind:"image",text:IMAGE_TOKEN,sticker};
  assert.equal(Object.values(collectInlineStickers([[line[0],image,line[2]]]))[0].id,"asset");
});
