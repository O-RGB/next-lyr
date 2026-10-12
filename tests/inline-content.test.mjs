import test from "node:test";
import assert from "node:assert/strict";
import { moveCellContent, dropCellContent, insertCellAfter, cellsFromLine, migrateInlineStickers, collectInlineStickers, IMAGE_TOKEN } from "../src/lib/karaoke/inline-content.ts";

const sticker = { id:"asset",name:"test.png",mime:"image/png",width:24,height:24,bytes:100,originalBytes:200,position:"before" };
const line = ["A","B","C"].map((text,index) => ({text,at:index+1,index,lineIndex:0}));

test("move C before A, retaining the destination timing slot indexes", () => {
  const cells = cellsFromLine(line), moved = moveCellContent(cells,2,0);
  assert.deepEqual(moved.map(c=>c.text),["C","A","B"]);
  assert.deepEqual(moved.map(c=>c.originalIndex),[0,1,2]);
  assert.deepEqual(cells.map(c=>c.text),["A","B","C"]);
});
test("images move between words without taking their timing slots", () => {
  const cells = [...cellsFromLine(line),{key:"image",originalIndex:null,kind:"image",text:IMAGE_TOKEN,vocal:"",sticker}];
  const moved = moveCellContent(cells,3,1);
  assert.deepEqual(moved.map(c=>c.kind),["text","image","text","text"]);
  assert.deepEqual(moved.map(c=>c.originalIndex),[0,null,1,2]);
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
  assert.equal(upgraded[0][0].at,null);
});
test("legacy migration is idempotent, including a timestamp of zero", () => {
  const zero=[{...line[0],at:0}];const once=migrateInlineStickers([zero],{0:sticker});
  assert.equal(once[0][0].at,null);
  assert.equal(migrateInlineStickers(once,{0:sticker})[0].length,2);
});
test("asset cleanup retains images at arbitrary inline positions", () => {
  const image={...line[1],kind:"image",text:IMAGE_TOKEN,sticker};
  assert.equal(Object.values(collectInlineStickers([[line[0],image,line[2]]]))[0].id,"asset");
});

test("dropping text or an image inside a group adopts the exact preset and keeps text slots", () => {
  const effect={type:"rain",variant:"storm",connected:true};
  const image={key:"image",originalIndex:null,kind:"image",text:IMAGE_TOKEN,vocal:"",sticker};
  const cells=[...cellsFromLine(line).map((c,i)=>({...c,effect:i<2?effect:undefined})),image];
  for(const from of [2,3]) {
    const moved=dropCellContent(cells,from,1,effect);
    assert.deepEqual(moved[1].effect,effect);
    assert.deepEqual(moved.filter(c=>c.kind!=="image").map(c=>c.originalIndex),[0,1,2]);
    assert.equal(cells[from].effect,undefined);
  }
});
test("a drop outside a group removes membership without spreading its effect",()=>{
  const cells=cellsFromLine(line);cells[0].effect={type:"lightning",connected:false};
  const moved=dropCellContent(cells,0,2);
  assert(moved.every(c=>!c.effect));
  assert.equal(cells[0].effect.type,"lightning");
});

test("a new word inserted between connected group members joins without splitting the range",()=>{
  const effect={type:"rain",connected:true,variant:"storm"};
  const cells=cellsFromLine(line).map(c=>({...c,effect}));
  const word={key:"new",originalIndex:null,kind:"text",text:"new",vocal:""};
  const inserted=insertCellAfter(cells,word,cells[0].key);
  assert.deepEqual(inserted.map(c=>c.effect),[effect,effect,effect,effect]);
  assert.deepEqual(inserted.map(c=>c.originalIndex),[0,null,1,2]);
  assert.equal(word.effect,undefined);
  assert.equal(insertCellAfter(cells,word,cells[2].key).at(-1).effect,undefined);
});
test("insertion between separate effect groups never guesses a group membership",()=>{
  const cells=cellsFromLine(line);
  cells[0].effect={type:"fire",connected:true};cells[1].effect={type:"lightning",connected:true};
  const inserted=insertCellAfter(cells,{key:"new",originalIndex:null,kind:"text",text:"new",vocal:""},cells[0].key);
  assert.equal(inserted[1].effect,undefined);
});
test("a member can leave its group without changing its position or timestamp slot",()=>{
  const cells=cellsFromLine(line).map(c=>({...c,effect:{type:"fire",connected:true}}));
  const dropped=dropCellContent(cells,1,1);
  assert.deepEqual(dropped.map(c=>c.effect?.type),["fire",undefined,"fire"]);
  assert.deepEqual(dropped.map(c=>c.originalIndex),[0,1,2]);
  assert.equal(dropCellContent(dropped,1,1),dropped);
});
test("reordering existing and new images leaves every text slot and image identity intact",()=>{
  const cells=insertImages(cellsFromLine(line));
  function insertImages(cells){return [...cells,{key:"old-image",originalIndex:9,kind:"image",text:IMAGE_TOKEN,vocal:"",sticker},{key:"new-image",originalIndex:null,kind:"image",text:IMAGE_TOKEN,vocal:"",sticker}];}
  const moved=moveCellContent(moveCellContent(cells,3,0),4,2);
  assert.deepEqual(moved.filter(c=>c.kind!=="image").map(c=>c.originalIndex),[0,1,2]);
  assert.equal(moved.find(c=>c.key==="old-image").originalIndex,9);
  assert.equal(moved.find(c=>c.key==="new-image").originalIndex,null);
});
